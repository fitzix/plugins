'use strict';

const https = require('https');
const path = require('path');
const fs = require('fs');

function getBuildConfig() {
  try {
    let settingPath = path.join(Editor.Project.path, 'settings', 'bi-sdk-plugin.json')
    return JSON.parse(fs.readFileSync(settingPath, 'utf8'))
  } catch (error) {
    return {
      url: '',
      game: 1,
      region: 1,
      channel: 1,
      iOS: 1,
      android: 1,
      used: false
    }
  }
}

function getSdk(plat) {
  Editor.log('【BISDK】', '开始下载SDK文件')
  return new Promise((resolve, reject) => {
    https.get(`https://cdn.jsdelivr.net/npm/@fitzix/bi/dist/leuok.bi.${plat}.js`, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        Editor.log('【BISDK】', 'SDK文件下载完成')
        resolve(data)
      })
    }).on("error", (err) => {
      reject(err)
    })
  })
}


async function onBeforeBuildFinish(options, callback) {

  //  根据平台类型  获取队形sdk
  let sdkMap = new Map([
    ['web-mobile', 'h5'],
    ['vivo-runtime', 'vivo'],
    ['oppo-runtime', 'oppo'],
    ['qqplay', 'qq'],
    ['wechatgame', 'wx']
  ])

  // 不同平台 全局变量名称
  let sdkGlobalMap = new Map([
    ['web-mobile', 'window'],
    ['vivo-runtime', 'qg'],
    ['oppo-runtime', 'qg'],
    ['qqplay', 'BK'],
    ['wechatgame', 'wx']
  ])

  let buildConfig = getBuildConfig()

  let initScript = `

    /**
     * Copyright 2018 The Gameley-TC Authors. 
     * All rights reserved.
     * BISDK 初始化
     */
    ${sdkGlobalMap.get(options.actualPlatform)}.leuok.init({
      url: '${buildConfig.url}',
      gameId: ${buildConfig.game},
      regionId: ${buildConfig.region},
      channelId: ${buildConfig.channel}
    });

    
  `

  // 同步 jsdelivr cdn sdk文件
  Editor.log('【BISDK】', '开始创建SDK文件')

  try {
    let sdkStr = await getSdk(sdkMap.get(options.actualPlatform))
    if (['vivo-runtime', 'oppo-runtime'].includes(options.actualPlatform)) {
      let mainJsPath = path.join(options.dest, 'main.js')
      let script = fs.readFileSync(mainJsPath, 'utf8')
      fs.writeFile(mainJsPath, sdkStr + initScript + script)
    } else {
      // qq wx web 存储为文件单独引入
      fs.writeFile(path.join(options.dest, `leuok.bi.${sdkMap.get(options.actualPlatform)}.js`), sdkStr, (err) => {
        if (err) {
          Editor.error('【BISDK】', '创建SDK文件失败 -->', err)
          return
        }
      })
    }

  } catch (err) {
    Editor.error('【BISDK】', '获取远程SDK文件失败 -->', err.message)
  }

  // 如果是web app 修改 index.html
  if (options.actualPlatform === 'web-mobile') {
    let fileBuffer = fs.readFileSync(path.join(options.dest, 'index.html'), 'utf8')
    let fileLines = fileBuffer.toString().split('\n')

    let targetIndex = fileLines.findIndex((val, index, arr) => {
      return val === '<script src="src/settings.js" charset="utf-8"></script>'
    })

    fileLines.splice(targetIndex, 0, `
      <script src="leuok.bi.h5.js" charset="utf-8"></script>
      <script>
        ${initScript}
      </script>
    `)
    // 写入文件
    fs.writeFile(path.join(options.dest, 'index.html'), fileLines.join('\n'), (err) => {
      if (err) {
        Editor.error('【BISDK】', '修改index.html失败 -->', err)
        return
      }
    })
    return
  }

  // for qq wx 
  if (['qqplay', 'wechatgame'].includes(options.actualPlatform)) {
    let mainJsPath = path.join(options.dest, 'main.js')
    let script = fs.readFileSync(mainJsPath, 'utf8')

    let requireScript = options.actualPlatform === 'qqplay' ? `BK.Script.loadlib('GameRes://leuok.bi.qq.js');` : `require('./leuok.bi.wx.js');`

    fs.writeFileSync(mainJsPath, `

      /**
       * Copyright 2018 The Gameley-TC Authors. 
       * All rights reserved.
       * BISDK 初始化
       */
      ${requireScript}
      ${sdkGlobalMap.get(options.actualPlatform)}.leuok.init({
        url: '${buildConfig.url}',
        gameId: ${buildConfig.game},
        regionId: ${buildConfig.region},
        iOS: ${buildConfig.iOS},
        android: ${buildConfig.android}
      });


      ${script}
    `)
  }

  // 对于 快游戏(oppo, vivo) 在获取sdk时处理 直接合并进入main.js

  callback()
}


module.exports = {
  load() {
    let buildConfig = getBuildConfig()
    if (buildConfig.used) {
      Editor.log('【BISDK】', '开启构建后添加SDK')
      Editor.Builder.on('before-change-files', onBeforeBuildFinish)
    }
    // execute when package loaded
  },

  unload() {
    // execute when package unloaded
    Editor.Builder.removeListener('before-change-files', onBeforeBuildFinish)
  },

  // register your ipc messages here
  messages: {
    'bi-used-changed'(event, config) {
      Editor.Panel.close('bi')

      let buildConfig = getBuildConfig()
      // 判断是否在load时已开启监听
      if (buildConfig.used != config.used) {
        if (config.used) {
          Editor.log('【BISDK】', '开启构建后添加SDK', config)
          Editor.Builder.on('before-change-files', onBeforeBuildFinish)
        } else {
          Editor.log('【BISDK】', '关闭构建后添加SDK')
          Editor.Builder.removeListener('before-change-files', onBeforeBuildFinish)
        }
      } else {
        if (config.used) {
          Editor.log('【BISDK】', '开启构建后添加SDK', config)
        } else {
          Editor.log('【BISDK】', '关闭构建后添加SDK')
        }
      }

      let settingPath = path.join(Editor.Project.path, 'settings', 'bi-sdk-plugin.json')
      fs.writeFile(settingPath, JSON.stringify(config, null, 4), (err) => {
        if (err) {
          Editor.error('【BISDK】', '生成配置文件失败', err.message)
        }
      })
      
    },
    'open'() {
      // open entry panel registered in package.json
      Editor.Panel.open('bi', getBuildConfig())
    }
  },
};