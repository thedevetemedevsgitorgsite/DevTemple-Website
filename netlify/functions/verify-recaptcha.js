exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { token } = JSON.parse(event.body);
  
  const verifyURL = `https://www.google.com/recaptcha/api/siteverify`;
  
  const response = await fetch(verifyURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${process.env.RECAPTCHA_KEY}&response=${token}`
  });
  
  const data = await response.json();
  
  return {
    statusCode: 200,
    body: JSON.stringify({ success: data.success })
  };
};
