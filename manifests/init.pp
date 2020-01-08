class repowatch (

  $user                 = 'repowatchdeploy',
  $group                = 'www-data',
  $service_user         = 'node',
  $service_name         = 'repowatch',
  $servername           = 'localhost',
  $artifact_module      = 'repowatch',
  $hostalias            = $::hostname,
  $aliases              = [],
  $cert_directory_path  = '/etc/pki/tls/certs',
  $key_directory_path   = '/etc/pki/tls/private',
  $cert_name            = undef,
  $webhook              = undef,
  $source_path          = '/repowatch',
  $target_path          = '/srv/repowatch',
  $default_html_docroot = '/var/www/html',
  $watchers             = {},
  $watcher_defaults     = {},

) {

  if ($watchers != {}) {
    create_resources(repowatch::watcher, $watchers, $watcher_defaults)
  }

}
