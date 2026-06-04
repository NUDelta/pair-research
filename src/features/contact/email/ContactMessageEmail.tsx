import type { ContactFormValues } from '@/features/contact/schemas/contact'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { SEO_SITE_NAME } from '@/shared/seo'

interface ContactMessageEmailProps extends ContactFormValues {
  siteBaseUrl: string
}

const styles = {
  body: {
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    fontFamily: 'Arial, sans-serif',
    margin: 0,
  },
  container: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    margin: '32px auto',
    padding: '28px',
    width: '560px',
  },
  details: {
    marginTop: '20px',
  },
  eyebrow: {
    color: '#0369a1',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: 0,
    margin: '0 0 8px',
    textTransform: 'uppercase' as const,
  },
  header: {
    marginBottom: '8px',
  },
  heading: {
    color: '#0f172a',
    fontSize: '24px',
    fontWeight: 700,
    lineHeight: '32px',
    margin: 0,
  },
  hr: {
    borderColor: '#e2e8f0',
    margin: '24px 0',
  },
  label: {
    color: '#64748b',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: 0,
    margin: '16px 0 4px',
    textTransform: 'uppercase' as const,
  },
  message: {
    color: '#0f172a',
    fontSize: '15px',
    lineHeight: '24px',
    margin: '8px 0 0',
    whiteSpace: 'pre-wrap' as const,
  },
  value: {
    color: '#0f172a',
    fontSize: '15px',
    lineHeight: '22px',
    margin: 0,
  },
}

export default function ContactMessageEmail({
  email,
  message,
  name,
  siteBaseUrl,
}: ContactMessageEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`New Pair Research contact message from ${name}`}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.eyebrow}>{SEO_SITE_NAME}</Text>
            <Heading style={styles.heading}>New contact message</Heading>
          </Section>

          <Section style={styles.details}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{name}</Text>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{email}</Text>
            <Text style={styles.label}>Site</Text>
            <Text style={styles.value}>{siteBaseUrl || 'unknown'}</Text>
          </Section>

          <Hr style={styles.hr} />

          <Section>
            <Text style={styles.label}>Message</Text>
            <Text style={styles.message}>{message}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
