import { mount } from 'svelte'
import axios from 'axios'
import './app.css'
import App from './App.svelte'
import { apiBaseUrl } from './lib/env.js'

axios.defaults.baseURL = apiBaseUrl

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
