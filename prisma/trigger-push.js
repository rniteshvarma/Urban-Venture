fetch('https://urban-venture.vercel.app/api/admin/db-push')
  .then(async res => {
    console.log('Status:', res.status);
    try {
      const json = await res.json();
      console.log('JSON:', JSON.stringify(json, null, 2));
    } catch (e) {
      const text = await res.text();
      console.log('Text:', text);
    }
  })
  .catch(err => {
    console.error('Fetch error:', err);
  });
