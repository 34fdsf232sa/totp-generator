const { createApp } = Vue;

createApp({
  data() {
    return {
      hex: '',
    };
  },

  computed: {
    base32: function () {
      if (!this.hex) return '';
      try {
        const buf = OTPAuth.Utils.hex.decode(this.hex);
        return OTPAuth.Utils.b32.encode(buf);
      } catch (e) {
        return '';
      }
    }
  }
}).mount('#app');
