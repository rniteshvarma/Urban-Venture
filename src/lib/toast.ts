export const toast = {
  success: (msg: string) => {
    if (typeof window !== 'undefined') {
      console.log('✅ [SUCCESS]', msg);
    }
  },
  error: (msg: string) => {
    if (typeof window !== 'undefined') {
      console.error('❌ [ERROR]', msg);
    }
  }
};
