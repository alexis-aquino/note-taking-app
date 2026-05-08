import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3000', // your Node.js backend
  withCredentials: true             // important for sessions/cookies
})

export default api