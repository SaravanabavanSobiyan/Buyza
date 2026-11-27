export const verifyCaptcha = async (token, ip) => {
  const secret = process.env.RECAPTCHA_SECRET;

  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }
  if (!token) return false;

  try {
    const params = new URLSearchParams({ secret, response: token });
    if (ip) params.append('remoteip', ip);
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      body: params,
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
};
