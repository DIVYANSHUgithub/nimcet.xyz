export const legalDetails = {
  operatorName: 'Divyanshu Mishra',
  postalAddress: 'Netaram Chauraha, Prayagraj, Uttar Pradesh 211002, India',
  email: 'nimcet.xyz@gmail.com',
  origin: 'https://www.nimcet.xyz',
  updated: '2026-11-18',
  updatedLabel: '18 November 2026',
}

export const legalLinks = [
  { label: 'Privacy Policy', to: '/privacy-policy', description: 'How NIMCET.XYZ uses account, learning and technical information.' },
  { label: 'Terms of Service', to: '/terms', description: 'Terms for accounts, question practice, mock tests and use of NIMCET.XYZ.' },
  { label: 'Contact Us', to: '/contact', description: 'Contact NIMCET.XYZ for support, test issues, privacy requests and complaints.' },
]

// Static metadata is useful before JavaScript; React owns it after startup.
export function clearPrerenderedLegalMetadata(doc) {
  doc.head.querySelectorAll('[data-legal-prerender]').forEach(node => node.remove())
}
