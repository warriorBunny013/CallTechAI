import { Intent } from './supabase'

export const sampleIntents: Omit<Intent, 'id' | 'created_at'>[] = [
  {
    intent_name: "Business Hours",
    example_user_phrases: [
      "What are your business hours?",
      "When are you open?",
      "What time do you close?",
      "What are your operating hours?"
    ],
    english_responses: [
      "Our business hours are Monday to Friday from 9 AM to 6 PM, and Saturday from 10 AM to 4 PM. We are closed on Sundays."
    ],
    russian_responses: [
      "Наш рабочий график: с понедельника по пятницу с 9:00 до 18:00, в субботу с 10:00 до 16:00. В воскресенье мы закрыты."
    ]
  },
  {
    intent_name: "Location",
    example_user_phrases: [
      "Where are you located?",
      "What's your address?",
      "How do I get to your office?",
      "Where can I find you?"
    ],
    english_responses: [
      "We are located at 123 Business Street, Suite 456, New York, NY 10001. You can find directions on our website."
    ],
    russian_responses: [
      "Мы находимся по адресу: улица Деловая 123, офис 456, Нью-Йорк, NY 10001. Вы можете найти маршрут на нашем сайте."
    ]
  },
  {
    intent_name: "Pricing",
    example_user_phrases: [
      "How much do your services cost?",
      "What are your rates?",
      "Can you tell me about pricing?",
      "How much does it cost?"
    ],
    english_responses: [
      "Our pricing varies based on your needs. Basic plans start at $99/month, and we offer custom solutions for larger businesses. Contact us for a personalized quote."
    ],
    russian_responses: [
      "Наши цены зависят от ваших потребностей. Базовые планы начинаются с $99 в месяц, и мы предлагаем индивидуальные решения для крупных предприятий. Свяжитесь с нами для получения персонального предложения."
    ]
  }
] 