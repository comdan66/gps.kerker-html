<?php

/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2019, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

namespace HTML;

echo Html(
  Head(
    Meta()->attr('http-equiv', 'Content-Language')->content('zh-tw'),
    Meta()->attr('http-equiv', 'Content-type')    ->content('text/html; charset=utf-8'),
    Meta()->name('viewport')                      ->content('width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,minimal-ui'),
    Meta()->name('robots')                        ->content('noindex,nofollow'),

    Title(TITLE),

    \Asset::create()
          ->appendCSS('index.css')
          ->appendJS('https://code.jquery.com/jquery-1.12.4.min.js')
          ->appendJS('https://cdnjs.cloudflare.com/ajax/libs/vue/2.6.11/vue.min.js')
          ->appendJS('index.js')

          ->appendVueComponent('layout')
          ->appendVueComponent('uikit')
          ->appendVueComponent('list')
          ->appendVueComponent('oaips')
  ),
  Body(
  )
)->lang('zh-Hant');
