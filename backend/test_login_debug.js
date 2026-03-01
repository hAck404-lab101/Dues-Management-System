const axios = require('axios');
async function test() {
    try {
        const res = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@htu.edu.gh',
            password: 'Admin123!'
        });
        console.log('Login Result:', res.data);
    } catch (e) {
        console.error('Login Failed:', e.response?.data || e.message);
    } finally {
        process.exit();
    }
}
test();
