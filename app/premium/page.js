import PremiumClient from './premium-client'

export const metadata = {
  title: 'Free, Plus & Pro — PassGram Premium',
  description: 'Compare PassGram Free, Plus and Pro. Choose the plan that fits your account.',
  alternates: { canonical: 'https://web.zpas.org/premium' },
}

export default function PremiumPage() {
  return <PremiumClient />
}
