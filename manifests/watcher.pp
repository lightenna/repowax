define repowatch::watcher (

  $user                   = $repowatch::user,
  $group                  = $repowatch::group,
  $servername             = $repowatch::servername,
  $aliases                = $repowatch::aliases,
  $apache_port            = 7777,
  $service_port           = 3001,
  $service_user           = $repowatch::service_user,
  $service_name           = $repowatch::service_name,
  $hostalias              = $repowatch::hostalias,
  $artifact_module        = $repowatch::artifact_module,
  $source_path            = $repowatch::source_path,
  $target_path            = $repowatch::target_path,
  $default_html_docroot   = $repowatch::default_html_docroot,
  $cert_directory_path    = $repowatch::cert_directory_path,
  $key_directory_path     = $repowatch::key_directory_path,
  $cert_name              = $repowatch::cert_name,
  $webhook                = $repowatch::webhook,
  $repo_list              = [],
  $secret                 = undef,
  $manage_vhost           = true,
  $transfer_files         = true,
  $external_service_https = true,

) {

  include "apache::mod::proxy"
  include "apache::mod::proxy_http"

  # transfer binary
  if ($transfer_files) {
    exec { "repowatch-watcher-${apache_port}-${service_port}-files-prereq":
      path    => ['/bin', '/usr/bin'],
      command => "mkdir -p ${target_path}",
      unless  => "test -d ${target_path}",
      before  => [File["repowatch-watcher-${apache_port}-${service_port}-files"]],
    }
    file { "repowatch-watcher-${apache_port}-${service_port}-files":
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
  ensure_resource(file, "repowatch-watcher-${apache_port}-${service_port}-config-file-ecosys", {
    ensure  => 'present',
    content => epp('repowatch/ecosystem.config.js.epp', {
      # explicitly push through because cannot refer to repowatch::var_name in defined type
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
  exec { "repowatch-watcher-${apache_port}-${service_port}-start-pm2":
    path    => ['/bin', '/usr/bin', '/usr/lib/node_modules/pm2/bin'],
    notify  => Class['::apache::service'],
    require => [File["${target_path}"], Class['webtools::node'], User["${service_user}"]],
    unless => "sudo -u ${service_user} pm2 describe --silent ${service_name} > /dev/null",
    command => @("END")
        sudo -u ${service_user} bash \
        -c 'cd ~ ; (pm2 list | grep ${service_name}) || pm2 start ${target_path}/ecosystem.config.js --env production --watch'
        | END
  }

  # set up apache vhost
  if ($manage_vhost) {
    # all external requests are proxied (to app/microservices) and require basic auth
    apache::vhost { "repowatch-watcher-${apache_port}-${service_port}-vhost":
      port            => $apache_port,
      servername      => $servername,
      serveraliases   => $aliases,
      docroot         => $default_html_docroot,
      docroot_owner   => $user,
      docroot_group   => $group,
      proxy_requests  => false, # Off
      custom_fragment => @("END")
        ProxyPass        "/${service_name}/"  "http://localhost:${service_port}/${service_name}/"
        ProxyPassReverse "/${service_name}/"  "http://localhost:${service_port}/${service_name}/"
      | END
    }

    # by default, all external requests are made over HTTPS
    if ($external_service_https) {
      ::Apache::Vhost <| title == "repowatch-watcher-${apache_port}-${service_port}-vhost" |> {
        ssl               => true,
        ssl_cert          => "${cert_directory_path}/${cert_name}.crt",
        ssl_ca            => "${cert_directory_path}/${cert_name}.ca-bundle",
        ssl_key           => "${key_directory_path}/${cert_name}.key",
        # verify client required in order to include ssl_ca
        ssl_verify_client => 'none',
      }
    }

    if (($apache_port != 80) and ($apache_port != 443)) {
      if (str2bool($::selinux)) {
        ensure_resource(selinux::port, "repowatch-watcher-${apache_port}-port", {
          seltype  => 'http_port_t',
          port     => $apache_port,
          protocol => 'tcp',
          notify   => Class['::apache::service'],
        })
        ensure_resource(selinux::port, "repowatch-watcher-${service_port}-port", {
          seltype  => 'http_port_t',
          port     => $service_port,
          protocol => 'tcp',
          notify   => Class['::apache::service'],
        })
      }

      if defined(Class['domotd']) {
        # register external services ()
        @domotd::register { "Apache(${apache_port})" : }
        # register internal services []
        @domotd::register { "repowatch[${service_port}]" : }
      }
    }
  }

}
