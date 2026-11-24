import AuthBenefits from './AuthBenefits'
import SignupIllustration from './SignupIllustrations'

export default function SignupBenefits() {
  return (
    <AuthBenefits
      title="Account access"
      Illustration={SignupIllustration}
      className="flex flex-col justify-center border-t border-line bg-canvas-muted p-5 sm:p-8 lg:border-l lg:border-t-0"
    />
  )
}
