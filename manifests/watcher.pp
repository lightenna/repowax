define repowax::watcher (

  $user                   = $repowax::user,
  $group                  = $repowax::group,
  $servername             = $repowax::servername,
  $aliases                = $repowax::aliases,
  $apache_port            = 7777,
  $service_port           = 3001,
  $service_user           = $repowax::service_user,
  $service_name           = $repowax::service_name,
  $hostalias              = $repowax::hostalias,
  $artifact_module        = $repowax::artifact_module,
  $source_path            = $repowax::source_path,
  $target_path            = $repowax::target_path,
  $default_html_docroot   = $repowax::default_html_docroot,
  $cert_directory_path    = $repowax::cert_directory_path,
  $key_directory_path     = $repowax::key_directory_path,
  $cert_name              = $repowax::cert_name,
  $webhook                = $repowax::webhook,
  $repo_list              = [],
  $secret                 = undef,
  $install_vhosts         = true,
  $transfer_files         = true,
  $external_service_https = true,

) {

  include "apache::mod::proxy"
  include "apache::mod::proxy_http"

  # transfer binary
  if ($transfer_files) {
    exec { "repowax-watcher-${apache_port}-${service_port}-files-prereq":
      path    => ['/bin', '/usr/bin'],
      command => "mkdir -p ${target_path}",
      unless  => "test -d ${target_path}",
      before  => [File["repowax-watcher-${apache_port}-${service_port}-files"]],
    }
    file { "repowax-watcher-${apache_port}-${service_port}-files":
      ensure  => 'directory',
      source  => "puppet:///modules/${artifact_module}/${source_path}",
      recurse => 'remote',
      path    => "${target_path}",
      owner   => $user,
      group   => $group,
      mode    => '0750',
    }
  } else {
    # create referable file resource like above
    ensure_resource(usertools::safe_directory, "${target_path}", {
      user  => $user,
      group => $group,
      path  => "${target_path}",
    })
  }

  # create config file
  ensure_resource(file, "repowax-watcher-${apache_port}-${service_port}-config-file-ecosys", {
    ensure  => 'present',
    content => epp('repowax/ecosystem.config.js.epp', {
      # explicitly push through because cannot refer to repowax::var_name in defined type
      hostalias    => $hostalias,
      target_path  => $target_path,
      service_port => $service_port,
      secret       => $secret,
      repo_list    => $repo_list,
      webhook      => $webhook,
    }),
    path    => "${target_path}/ecosystem.config.js",
    owner   => $user,
    group   => $group,
    mode    => '0640',
    seltype => 'httpd_sys_content_t',
  })

  # run the microservice using pm2, once only to avoid untoggling the --watch var
  exec { "repowax-watcher-${apache_port}-${service_port}-start-pm2":
    path    => ['/bin', '/usr/bin', '/usr/lib/node_modules/pm2/bin'],
    notify  => Class['::apache::service'],
    require => [File["${target_path}"], Class['webtools::node'], User["${service_user}"]],
    unless => "sudo -u ${service_user} pm2 describe --silent ${service_name} > /dev/null",
    command => @("END")
        sudo -u ${service_user} bash \
        -c 'cd ~ ; (pm2 list | grep ${service_name}) || pm2 start ${target_path}/ecosystem.config.js --env production --watch'
        | END
  }

  # register internal services []
  @domotd::register { "repowax[${service_port}]" : }

  # set up apache vhost
  if ($install_vhosts) {
    webtools::proxyport { "repowax-watcher-proxyport-${apache_port}":
      service_port           => $service_port,
      service_path           => $service_name,
      apache_port            => $apache_port,
      apache_path            => $service_name,
      external_service_https => $external_service_https,
      servername             => $servername,
      aliases                => $aliases,
      cert_directory_path    => $cert_directory_path,
      key_directory_path     => $key_directory_path,
      cert_name              => $cert_name,
      default_html_docroot   => $default_html_docroot,
      user                   => $user,
      group                  => $group,
    }
  }

}
