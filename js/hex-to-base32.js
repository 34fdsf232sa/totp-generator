const { createApp } = Vue;

createApp({
  data() {
    return {
      hex: '',
    };
  },

  computed: {
    base32: function () {
      const buf = OTPAuth.Utils.hex.encode(this.hex);
      return OTPAuth.Utils.b32.decode(buf);
    }
  }
}).mount('#app');
