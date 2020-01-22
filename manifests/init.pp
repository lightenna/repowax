class repowax (

  $user                 = 'repowaxdeploy',
  $group                = 'www-data',
  $service_user         = 'node',
  $service_name         = 'repowax',
  $servername           = 'localhost',
  $artifact_module      = 'repowax',
  $hostalias            = $::fqdn,
  $aliases              = [],
  $cert_directory_path  = '/etc/pki/tls/certs',
  $key_directory_path   = '/etc/pki/tls/private',
  $cert_name            = undef,
  $webhook              = undef,
  $source_path          = 'repowax',
  $target_path          = '/srv/repowax',
  $default_html_docroot = '/var/www/html',
  $watchers             = {},
  $watcher_defaults     = {},

) {

  if ($watchers != {}) {
    create_resources(repowax::watcher, $watchers, $watcher_defaults)
  }

}
