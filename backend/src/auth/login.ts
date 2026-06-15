export async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required.'
      });
    }

    // TODO: authentication logic
    // Validate the credentials and return a session or token.

    return res.json({
      success: true,
      user: {
        email
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Login failed'
    });
  }
}
