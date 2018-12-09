// panel/index.js, this filename needs to match the one registered in package.json
Editor.Panel.extend({
  // css style for panel
  style: `
    :host { margin: 5px; }
    h2 { color: #f90; }
    label {
      display: inline-block;
      width: 200px;
      margin-left: 20px;
    }
    #bi-btn {
      position: absolute;
      width: 100px;
      right: 20px;
    }
  `,

  // html template for panel
  template: `
    <h2>${Editor.T('bi.app')}配置</h2>
    <p>
      <label for="bi-url">日志URL</label>
      <ui-input id="bi-url"></ui-input>
    </p>

    <p>
      <label for="bi-game">游戏ID</label>
      <ui-input id="bi-game"></ui-input>
    </p>
    
    <p>
      <label for="bi-region">区服ID</label>
      <ui-input id="bi-region"></ui-input>
    </p>

    <p>
      <label for="bi-channel">渠道ID</label>
      <ui-input id="bi-channel"></ui-input>
      <span>qq,wx平台忽略此项</span>
    </p>

    <p>
      <label for="bi-ios">安卓渠道</label>
      <ui-input id="bi-ios"></ui-input>
      <span>仅qq,wx平台</span>
    </p>

    <p>
      <label for="bi-android">iOS渠道</label>
      <ui-input id="bi-android"></ui-input>
      <span>仅qq,wx平台</span>
    </p>
    
    <label for="bi-used">是否启用构建后自动添加SDK</label>
    <ui-checkbox id="bi-used"></ui-checkbox>

    <hr />
    <ui-button class="green" id="bi-btn">确定</ui-button>
  `,

  // element and variable binding
  $: {
    biUrl: '#bi-url',
    biGame: '#bi-game',
    biChannel: '#bi-channel',
    biRegion: '#bi-region',
    biIOS: '#bi-ios',
    biAndroid: '#bi-android',
    biUsed: '#bi-used',
    biBtn: '#bi-btn'
  },

  // method executed when template and styles are successfully loaded and initialized
  ready () {
    this.$biBtn.addEventListener('click', () => {
      Editor.Ipc.sendToMain('bi:bi-used-changed', {
        url: this.$biUrl.value,
        game: this.$biGame.value,
        region: this.$biRegion.value,
        channel: this.$biChannel.value,
        iOS: this.$biIOS.value,
        android: this.$biAndroid.value,
        used: this.$biUsed.checked
      })
    });
  },

  run(data) {
    this.$biUrl.value = data.url
    this.$biGame.value = data.game
    this.$biRegion.value = data.region
    this.$biChannel.value = data.channel
    this.$biIOS.value = data.iOS
    this.$biAndroid.value = data.android
    this.$biUsed.checked = data.used
  }
});