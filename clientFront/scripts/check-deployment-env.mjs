import { loadEnv } from 'vite'
import { deploymentErrors } from './deployment-env.mjs'

const errors = deploymentErrors(loadEnv('production', process.cwd(), 'VITE_'))
if (errors.length) {
  console.error(`Deployment configuration failed:\n- ${errors.join('\n- ')}`)
  process.exitCode = 1
} else console.log('Frontend deployment configuration passed. Values will be embedded at build time.')
