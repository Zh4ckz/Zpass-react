import ActionClient from './action-client'

export const metadata = {
  title: 'Account — PassGram',
  description: 'Verify your email or reset your PassGram password.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default function AuthActionPage() {
  return <ActionClient />
}
