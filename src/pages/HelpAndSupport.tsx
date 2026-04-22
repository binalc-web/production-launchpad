/**
 * Help and Support Page Component
 *
 * This component renders the Help and Support page, including video tutorials and FAQs.
 * It provides users with resources to understand and use the platform effectively.
 * The page includes a scrollable video section and an accordion-based FAQ section.
 */

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardMedia,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import Breadcrumbs, { type BreadcrumbItem } from '../components/Breadcrumbs';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  HeadsetIcon,
  MinusCircleIcon,
  PlayIcon,
  PlusCircleIcon,
} from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/auth/useAuth';
import { trackEvent } from '@/utils/mixPanel/mixpanel';

/**
 * List of video tutorials displayed on the Help and Support page.
 */
const videos = [
  {
    title: 'MedicalEase Overview',
    thumbnail: 'https://img.youtube.com/vi/wAc0NLNcujU/maxresdefault.jpg',
    url: 'https://www.youtube.com/watch?v=wAc0NLNcujU',
  },
  {
    title: 'Dashboard',
    thumbnail: 'https://img.youtube.com/vi/u43uCGVWZbs/maxresdefault.jpg',
    url: 'https://www.youtube.com/watch?v=u43uCGVWZbs',
  },
  {
    title: 'Adding a New Case',
    thumbnail: 'https://img.youtube.com/vi/2BWlvgQ-D6o/maxresdefault.jpg',
    url: 'https://www.youtube.com/watch?v=2BWlvgQ-D6o',
  },
  {
    title: 'Medical Records',
    thumbnail: 'https://img.youtube.com/vi/gmKo6dPjxtA/maxresdefault.jpg',
    url: 'https://www.youtube.com/watch?v=gmKo6dPjxtA',
  },
  {
    title: 'Billing Chronology',
    thumbnail: 'https://img.youtube.com/vi/a2MCr9UQNN0/maxresdefault.jpg',
    url: 'https://www.youtube.com/watch?v=a2MCr9UQNN0',
  },
  {
    title: 'Inviting Users',
    thumbnail: 'https://img.youtube.com/vi/QOLMGQTAmlM/maxresdefault.jpg',
    url: 'https://www.youtube.com/watch?v=QOLMGQTAmlM',
  },
];

/**
 * List of FAQs displayed on the Help and Support page.
 */
const faqList = [
  {
    section: 'General Questions',
    questions: [
      {
        question: 'What is MedicalEase?',
        answer: `MedicalEase is a web application that offers smart tools that empower law firms, insurers, and 
other businesses who require health records for their operations. It facilitates fast, automated 
medical records retrieval. It also organizes those records into easy-to-read summaries and 
timelines and keeps health data safe through its digital chain of custody. Further, it is an online 
workflow collaboration and task management site that streamlines controlled, timely and secure 
access to pertinent health information for stakeholders.`,
      },
      {
        question: 'Who uses MedicalEase?',
        answer: `We work with personal injury, workers compensation and disability determination law firms, 
mass tort practices, insurance companies, and others who need accurate, secure, and quick access
to medical records and summaries. MedicalEase addresses several key pain points in the health 
information management workflow from record retrieval to organization to analysis to 
collaboration.`,
      },
      {
        question: 'How is MedicalEase different from other retrieval services?',
        answer: `We combine fast automation with expert human oversight. Our platform gives you clear 
chronologies, trusted summaries, and a secure space to manage medical cases, all in one place. 
Our priority on privacy and security and focus on resilient data assurance are other key 
differentiators.`,
      },
      {
        question:
          'Is your platform scalable for large firms or mass tort practices or enterprise insurance companies?',
        answer: `Yes! MedicalEase is built to handle lots of work. Whether you’re a solo user or a big business 
working on hundreds or thousands of cases at a time, we grow with you.`,
      },
    ],
  },
  {
    section: 'Medical Records Retrieval',
    questions: [
      {
        question: 'How do I request medical records?',
        answer: `Just use our dashboard to start a case and enter your records request. MedicalEase helps get 
client authorization and sends the digital request automatically through modern health networks. 
Important to note: we REQUIRE consent and authorization of the individual, their power of 
attorney or other legal guardian before we can initiate a record retrieval request and process the 
health information for the requested use case. We are using Clear for identity verification.`,
      },
      {
        question: 'How long does record retrieval take?',
        answer: `Most records come back in 3–5 business days, but some can take longer depending on the 
provider. It is important to note that some smaller clinics may not share records through digital 
networks, and these will be inaccessible for MedicalEase. You will need to retrieve these records
on your own using your current workflows and then upload them into MedicalEase. MedicalEase
does not offer manual record retrieval services.`,
      },
      {
        question: 'Do you retrieve records nationwide?',
        answer: `Yes! We can get medical records from all 50 states and U.S. territories.`,
      },
      {
        question:
          'Are you able to retrieve health records outside of the United States?',
        answer: `No. Our current capabilities do allow for the retrieval or management of international health records.`,
      },
      {
        question: 'Is record retrieval HIPAA compliant?',
        answer: `Absolutely. In fact, HIPAA (Health Insurance Portability and Accountability Act) is our 
minimum compliance standard. Additionally, we use top-level security and encryption to protect 
health data. Our post-quantum safe encryption standards keep your information secure for years 
to come.`,
      },
      {
        question:
          'Can MedicalEase help with incomplete or unstructured records?',
        answer: `Yes! Our smart tools (using artificial intelligence or AI techniques) find and organize important 
info, even from messy or incomplete records.`,
      },
    ],
  },
  {
    section: 'Medical & Billing Chronologies',
    questions: [
      {
        question: 'What is a medical or billing chronology?',
        answer: `These are documents that show a patient’s medical or billing history in chronological order. 
They are designed to help lawyers, collaborating experts and other business professionals 
quickly understand the care a person has received. Medical and billing records are inherently 
messy and complicated to understand. MedicalEase cleans up the mess!`,
      },
      {
        question: 'Who prepares the chronologies?',
        answer: `MedicalEase uses responsible and compliant AI to create the medical and billing chronologies. 
Our human-in-the-loop AI design approach combined with high quality data inputs and 
continuous process improvement standards ensure accurate, clear, and valuable outputs for your 
case.`,
      },
      {
        question: 'Can I customize how chronologies are formatted?',
        answer: `Not yet. Right now, our timelines follow expert-designed formats. We may add customization in 
the future based on your feedback.`,
      },
      {
        question:
          'How does MedicalEase handle case updates or new record batches for ongoing cases?',
        answer: `Just upload the new documents and records and MedicalEase will place them into the timeline 
automatically. There is no need to start over.`,
      },
      {
        question: 'Can I export chronologies or records into my own system?',
        answer: `Yes. You can download them in formats like PDF to use however you like. However, once 
exported from the MedicalEase platform, our digital chain of custody and data assurance features
will end for the life cycle of that external document.`,
      },
    ],
  },
  {
    section: 'Platform & Features',
    questions: [
      {
        question: 'Is there a portal to track my cases?',
        answer: `Yes. You can track case progress, assign tasks, share files and manage everything in real-time 
through the MedicalEase dashboard. Envision the MedicalEase portal as a digital health record 
management cockpit that enhances your team’s efficiency, productivity and experience.`,
      },
      {
        question: 'Can I upload digitized records and other documents?',
        answer: `Definitely. You can upload your own documents (e.g., client consents and authorizations, 
digitized medical records, power of attorneys, etc.) even if MedicalEase didn’t retrieve them. 
Your team still gets access to our automated medical and billing chronology features, document 
summaries, and task management tools.`,
      },
      {
        question: 'Do you offer deduplication and care summaries?',
        answer: `Yes. We clean up repeated data and create clear summaries. We also give patients clean copies 
of their records.`,
      },
      {
        question: 'Can I add users or collaborators to my account?',
        answer: `Yes! You can invite team members and third-party stakeholders according to your business 
needs and control who sees what in your secure workspace. Access controls and traceability are a
core component of the digital chain of custody service we provide for all customers.`,
      },
      {
        question: 'Can you integrate with EHR or EMR systems directly?',
        answer: `Not with our initial platform capabilities. We connect with health information exchanges that act 
as an intermediary between most EHR (electronic health record) and EMR (electronic medical 
record) systems and end-users such as patients and the businesses that patients authorize us to 
release their information.`,
      },
      {
        question:
          'Are you able to integrate with any legal practice or document management software?',
        answer: `Wait for it... We do not offer these integrations with our early MedicalEase application; 
however, we plan to build this capability. Please let us know the integrations you desire and the 
importance of this feature to your work.`,
      },
      {
        question: `My company would like to add record retrieval, chronology generation and data 
assurance functionality to our services, can we use MedicalEase to support our 
business?`,
        answer: `We would love to have that conversation! Currently we do not offer integrations to support the 
health record management operations of other companies but aim to do so in the future. Contact 
us when convenient to start the conversation.`,
      },
    ],
  },

  {
    section: 'Pricing & Plans',
    questions: [
      {
        question: 'How is your service priced?',
        answer: `We offer tiered annual subscription plans based on your needs. Contact us to find the best fit for 
your business. If you’re looking for an enterprise solution, we’re eager to customize 
MedicalEase to meet your needs.`,
      },
      {
        question: 'Are there volume discounts?',
        answer: `Yes. We offer discounts for larger caseloads and enterprise plans for big organizations.`,
      },
    ],
  },
  {
    section: 'Support, Security & Data Management',
    questions: [
      {
        question: 'What training or onboarding sessions do you offer?',
        answer: `We offer self-service videos of platform features and functionality as well as virtual onboarding 
sessions so your team can get started quickly.`,
      },
      {
        question: 'What kind of customer support do you offer?',
        answer: `Service level agreements differ according to your subscription package. These range from self-
service (videos of platform features and functionality, FAQs, etc) to asynchronous support 
ticketing solutions to a dedicated account manager and customer success team. We offer virtual 
onboarding sessions for all customers.`,
      },
      {
        question: 'How secure is your platform?',
        answer: `We’ve intentionally prioritized our data security for the threats of today and tomorrow. We use 
encryption, multi-factor login, access controls, blockchain-backed audits, and future-ready tech 
(i.e., post-quantum encryption standards) to protect your data at rest and in motion.`,
      },
      {
        question: 'Where is data stored and processed?',
        answer: `Your data is kept on secure cloud servers in the United States of America.`,
      },
      {
        question: 'What happens to my data if I cancel my subscription?',
        answer: `You’ll get time to download your data. After that, we delete it unless you ask us to keep it.`,
      },
      {
        question: 'What is data assurance? Why does it matter?',
        answer: `It means your data is accurate, reliable, available and safe. We use advanced tech, including 
blockchain and post-quantum security standards, to make sure it stays that way. Our traceability 
technology will report all access and changes made to the health information along its life cycle 
within the MedicalEase platform.`,
      },
    ],
  },
  {
    section: 'Legal & Compliance',
    questions: [
      {
        question: 'Is your service HIPAA and PCI compliant?',
        answer: `Yes. We follow strict rules to protect health and payment data to always remain in compliance with HIPAA, PII and PCI DSS (Payment Card Industry Data Security Standards).`,
      },
      {
        question: 'Do I need a Business Associate Agreement (BAA)?',
        answer: `No. We don’t work directly with HIPAA-covered healthcare providers (i.e., covered entities), so 
a BAA isn’t needed.`,
      },
      {
        question: 'How do you train your AI models?',
        answer: `We use expert-reviewed, anonymized medical data to teach our AI how to read and summarize 
health records safely and smartly. We believe that our responsible and compliant AI approach 
supports our core values of trust, service and delight.`,
      },
      {
        question: 'What is responsible and compliant AI?',
        answer: `Implementing responsible and compliant AI means developing, deploying, and using AI systems 
in a way that is ethical, trustworthy and aligned with both legal and ethical standards. This 
approach ensures that AI systems are used in ways that benefit society and respect individual 
rights.`,
      },
    ],
  },
];

const HelpAndSupport: React.FC = () => {
  /**
   * Breadcrumb items for the page.
   */
  const breadcrumbItems: Array<BreadcrumbItem> = [
    {
      title: 'Help & Support',
    },
  ];

  /**
   * Reference to the scrollable video container.
   */
  const scrollRef = useRef<HTMLDivElement>(null);

  const { basicUserDetails } = useAuth();

  /**
   * State to disable/enable the left scroll button.
   */
  const [disableLeft, setDisableLeft] = useState(true);

  /**
   * State to disable/enable the right scroll button.
   */
  const [disableRight, setDisableRight] = useState(false);

  /**
   * Updates the state of the scroll buttons based on the scroll position.
   */
  const updateButtonState = (): void => {
    const element = scrollRef.current;
    if (element) {
      const { scrollLeft, scrollWidth, clientWidth } = element;
      setDisableLeft(scrollLeft <= 0);
      setDisableRight(scrollLeft + clientWidth >= scrollWidth - 1); // -1 to account for rounding
    }
  };

  /**
   * Scrolls the video container left or right.
   *
   * @param {('left' | 'right')} direction - The direction to scroll.
   */
  const scroll = (direction: 'left' | 'right'): void => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = direction === 'left' ? -clientWidth : clientWidth;
      scrollRef.current.scrollTo({
        left: scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  /**
   * Sets up the scroll event listener to update button states.
   */
  useEffect(() => {
    const element = scrollRef.current;
    if (element) {
      updateButtonState();
      element.addEventListener('scroll', updateButtonState);
      return (): void =>
        element.removeEventListener('scroll', updateButtonState);
    }
  }, []);

  /**
   * Effect to track the page view event.
   */
  useEffect(() => {
    void trackEvent('Help and Support Page Viewed', {
      userId: basicUserDetails?.userId,
    });
  }, [basicUserDetails?.userId]);

  /**
   * State to track the currently expanded FAQ index.
   */
  const [expandedIndex, setExpandedIndex] = useState<number | false>(0);

  const [expandedSubIndex, setExpandedSubIndex] = useState<number | false>(0);

  /**
   * Toggles the expanded state of an FAQ item.
   *
   * @param {number} index - The index of the FAQ item to toggle.
   */
  const handleChange = (index: number): void => {
    setExpandedIndex((previous) => {
      if (previous === index) {
        setExpandedSubIndex(false);
        return false;
      }
      return index;
    });
  };

  /**
   * Toggles the expanded state of an FAQ item.
   *
   * @param {number} index - The index of the FAQ item to toggle.
   */
  const handleSubChange = (index: number): void => {
    setExpandedSubIndex((previous) => (previous === index ? false : index));
  };

  return (
    <>
      {/* Breadcrumbs and Page Header */}
      <Box mb={3}>
        <Breadcrumbs items={breadcrumbItems} />
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h4">Help & Support</Typography>
          <Box>
            <Button
              size="large"
              variant="contained"
              startIcon={<HeadsetIcon />}
              onClick={() => {
                void trackEvent('Zoho Support Form Opened', {
                  userId: basicUserDetails?.userId,
                });
                window.open(
                  `https://forms.zohopublic.com/solvereininc/form/SupportTickets/formperma/0M23aq0Q9HEmgkug2nn4CRsHMzv3QpBuMjFJTdng81s?Name_First=${basicUserDetails?.firstName}&Name_Last=${basicUserDetails?.lastName}&Email=${basicUserDetails?.email}`,
                  '_blank'
                );
              }}
            >
              Contact Support
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Video Tutorials Section */}
      <Box component={Paper}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          py={1.6}
          px={2.4}
        >
          <Typography fontWeight={600} fontSize={20}>
            Video Tutorials
          </Typography>

          <Stack direction="row" spacing={1}>
            <IconButton
              onClick={() => scroll('left')}
              disabled={disableLeft}
              sx={{
                border: '1px solid #e0e0e0',
                backgroundColor: 'transparent',
                '&:hover': {
                  backgroundColor: 'transparent',
                },
                '&:disabled': {
                  backgroundColor: 'white',
                },
              }}
            >
              <ArrowLeftIcon color={disableLeft ? 'gray' : 'neutral.400'} />
            </IconButton>
            <IconButton
              sx={{
                border: '1px solid #e0e0e0',
                backgroundColor: 'transparent',
                '&:hover': {
                  backgroundColor: 'transparent',
                },
                '&:disabled': {
                  backgroundColor: 'white',
                },
              }}
              onClick={() => scroll('right')}
              disabled={disableRight}
            >
              <ArrowRightIcon color={disableRight ? 'gray' : 'neutral.400'} />
            </IconButton>
          </Stack>
        </Box>
        <Divider />
        <Box
          px={2}
          pt={2}
          ref={scrollRef}
          sx={{
            display: 'flex',
            overflowX: 'auto',
            gap: 2,
            scrollBehavior: 'smooth',
            pb: 1,
          }}
        >
          {videos.map((video, index) => (
            <Card
              key={index}
              sx={{
                width: 400,
                flex: '0 0 auto',
                border: '0px',
                position: 'relative',
              }}
            >
              <Box position="relative">
                <CardMedia
                  sx={{
                    height: 220,
                    borderRadius: 2,
                    '&:hover': {
                      filter: 'brightness(0.8)',
                    },
                  }}
                  component="img"
                  image={video.thumbnail}
                  alt={video.title}
                />
                <IconButton
                  href={video.url}
                  target="_blank"
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'white',
                    '&:hover': {
                      backgroundColor: 'white',
                    },
                    zIndex: 1,
                    borderRadius: '50%',
                    padding: 1.5,
                  }}
                >
                  <PlayIcon weight="fill" color="black" />
                </IconButton>
              </Box>
              <Typography
                mt={2.4}
                mb={4}
                ml={0.5}
                variant="h5"
                fontWeight={600}
                fontSize={18}
              >
                {video.title}
              </Typography>
            </Card>
          ))}
        </Box>
      </Box>

      {/* FAQ Section */}
      <Box component={Paper} mt={2}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          py={1.6}
          px={2.4}
        >
          <Typography fontWeight={600} fontSize={20}>
            Frequently Asked Questions (FAQs)
          </Typography>
        </Box>
        <Divider />

        <Box px={2} pt={2} pb={4}>
          {faqList.map((item, index) => {
            return (
              <Accordion
                key={index}
                expanded={expandedIndex === index}
                onChange={() => handleChange(index)}
                elevation={0}
                disableGutters
                square
                sx={{
                  border: '1px solid #e0e0e0',
                  mb: 1.6,
                  borderRadius: 1.6,
                  '&::before': {
                    display: 'none',
                  },
                }}
              >
                <AccordionSummary
                  expandIcon={
                    expandedIndex === index ? (
                      <MinusCircleIcon color="#3957D7" size={24} />
                    ) : (
                      <PlusCircleIcon color="#8B95A5" size={24} />
                    )
                  }
                  aria-controls={`panel${index}-content`}
                  id={`panel${index}-header`}
                  sx={{ px: 2 }}
                >
                  <Typography
                    fontWeight={600}
                    variant="h6"
                    fontSize={16}
                    color="neutral.700"
                  >
                    {item.section}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
                  {item.questions.map((qa, qaIndex) => (
                    <Accordion
                      key={index}
                      expanded={expandedSubIndex === qaIndex}
                      onChange={() => handleSubChange(qaIndex)}
                      elevation={0}
                      disableGutters
                      square
                      sx={{
                        border: '1px solid #e0e0e0',
                        mb: 1.6,
                        borderRadius: 1.6,
                        '&::before': {
                          display: 'none',
                        },
                      }}
                    >
                      <AccordionSummary
                        expandIcon={
                          expandedSubIndex === qaIndex ? (
                            <MinusCircleIcon color="#3957D7" size={24} />
                          ) : (
                            <PlusCircleIcon color="#8B95A5" size={24} />
                          )
                        }
                        aria-controls={`panel${qaIndex}-content`}
                        id={`panel${qaIndex}-header`}
                        sx={{ px: 2 }}
                      >
                        <Typography
                          fontWeight={600}
                          variant="h6"
                          fontSize={16}
                          color="neutral.700"
                        >
                          {qa.question}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
                        <Typography
                          fontWeight={400}
                          variant="body1"
                          fontSize={16}
                          color="neutral.500"
                        >
                          {qa.answer}
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      </Box>
    </>
  );
};

export default HelpAndSupport;
