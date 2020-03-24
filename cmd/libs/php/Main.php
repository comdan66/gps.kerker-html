<?php

/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2019, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

mb_regex_encoding('UTF-8');
mb_internal_encoding('UTF-8');
date_default_timezone_set('Asia/Taipei');

include_once __DIR__ . DIRECTORY_SEPARATOR . 'Libs.php';

$argv = getArgv(array_slice($argv, 1), [
  ['--path', '-p'],
  ['--env', '-e'],
  // ['--base-url', '-b'],
]);

define('FILE_PATH', array_shift($argv['--path']));
define('ENVIRONMENT', array_shift($argv['--env']));
in_array(ENVIRONMENT, ['Development', 'Testing', 'Staging', 'Production']) ?: error('參數錯誤，請給予正確的 --env 參數，您給予「' + ENVIRONMENT + '」不再允許選項中！');
// define('BASE_URL', trim(array_shift($argv['--base-url']), '/') . '/');

switch (ENVIRONMENT) {
  default:
  case 'Development':
    define('API_URL', 'http://dev.api-gps.kerker.tw/api/f2e/');
    break;

  case 'Testing':
    define('API_URL', 'https://testing-api-gps.kerker.tw/api/f2e/');
    break;

  case 'Production':
    define('API_URL', 'https://api-gps.kerker.tw/api/f2e/');
    break;
}

definePATH();
defineVAR();

loadLib('HTML');
loadLib('Asset');
loadVendor('autoload');

loadFile(FILE_PATH);
