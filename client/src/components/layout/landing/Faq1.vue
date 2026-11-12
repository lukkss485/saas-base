<script setup>
import { ref, computed } from 'vue';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  HelpCircle,
  Search,
  X,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Settings,
  CreditCard,
  Users,
  ShieldCheck
} from 'lucide-vue-next';

// State
const searchQuery = ref('');
const selectedCategory = ref('all');

// Categories
const categories = [
  { id: 'all', name: 'All', icon: HelpCircle },
  { id: 'allgemein', name: 'General', icon: Settings },
  { id: 'konto', name: 'Account', icon: Users },
  { id: 'zahlung', name: 'Payment', icon: CreditCard },
  { id: 'sicherheit', name: 'Security', icon: ShieldCheck },
];

// FAQ Data
const faqs = [
  {
    id: 'faq-1',
    category: 'allgemein',
    question: 'What is an FAQ?',
    answer: 'An FAQ (Frequently Asked Questions) is a collection of frequently asked questions and their answers on a specific topic.',
    links: [
      { text: 'More about FAQs', url: '#' },
      { text: 'Best Practices', url: '#' }
    ]
  },
  {
    id: 'faq-2',
    category: 'konto',
    question: 'How can I change my password?',
    answer: 'You can change your password in the account settings under "Security". Follow the instructions and choose a secure password.',
    links: [
      { text: 'To account settings', url: '#' }
    ]
  },
  {
    id: 'faq-3',
    category: 'zahlung',
    question: 'What payment methods are accepted?',
    answer: 'We accept all common credit and debit cards (VISA, Mastercard, American Express), PayPal, and bank transfer.',
    links: [
      { text: 'Payment options', url: '#' },
      { text: 'Security guarantee', url: '#' }
    ]
  },
  {
    id: 'faq-4',
    category: 'sicherheit',
    question: 'How secure are my data?',
    answer: 'Your data is encrypted according to the highest security standards and stored in certified data centers in Germany.',
    links: [
      { text: 'Privacy policy', url: '#' },
      { text: 'Security measures', url: '#' }
    ]
  }
];

// Computed
const filteredFaqs = computed(() => {
  let filtered = faqs;

  // Filter by category
  if (selectedCategory.value !== 'all') {
    filtered = filtered.filter(faq => faq.category === selectedCategory.value);
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(faq =>
      faq.question.toLowerCase().includes(query) ||
      faq.answer.toLowerCase().includes(query)
    );
  }

  return filtered;
});
</script>

<template>
  <section class="py-20">
    <div class="container">
      <div class="mx-auto max-w-3xl">
        <!-- Header -->
        <div class="mb-14 text-center">
          <Badge variant="outline" class="mb-4">
            <HelpCircle class="mr-2 size-4" />
            FAQ
          </Badge>
          <h1 class="mb-4 text-3xl font-semibold md:mb-6 md:text-5xl">
            Frequently Asked Questions
          </h1>
          <p class="text-lg text-muted-foreground">
            Here you can find answers to the most frequently asked questions.
            Didn't find what you're looking for?
            <a href="#" class="font-medium text-primary hover:underline">Contact us</a>.
          </p>
        </div>

        <!-- FAQ Categories -->
        <div class="mb-8 flex flex-wrap justify-center gap-2">
          <Button v-for="category in categories" :key="category.id" variant="outline" :class="[
            'gap-2',
            selectedCategory === category.id ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-white' : ''
          ]" @click="selectedCategory = category.id">
            <component :is="category.icon" class="size-4" />
            {{ category.name }}
          </Button>
        </div>

        <!-- Search -->
        <div class="relative mb-8">
          <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input v-model="searchQuery" type="text" placeholder="Search for a question..."
            class="w-full rounded-lg border bg-background px-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <Button v-if="searchQuery" variant="ghost" size="icon"
            class="absolute right-2 top-1/2 size-6 -translate-y-1/2" @click="searchQuery = ''">
            <X class="size-4" />
          </Button>
        </div>

        <!-- FAQs -->
        <TransitionGroup
          name="list"
          tag="div"
          class="space-y-4"
          enter-active-class="transition-all duration-300 ease-in-out"
          leave-active-class="transition-all duration-300 ease-in-out"
          enter-from-class="opacity-0 translate-y-8"
          leave-to-class="opacity-0 translate-y-8"
        >
          <div v-for="(faq, index) in filteredFaqs" :key="faq.id">
            <Accordion type="single" :collapsible="true">
              <AccordionItem :value="faq.id">
                <AccordionTrigger class="group">
                  <div class="flex items-center gap-3 text-left">
                    <Badge :variant="faq.category === 'allgemein' ? 'default' : 'outline'" class="shrink-0">
                      {{ categories.find(c => c.id === faq.category)?.name }}
                    </Badge>
                    <span class="group-hover:text-primary">{{ faq.question }}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div class="prose prose-sm max-w-none">
                    <p>{{ faq.answer }}</p>

                    <div v-if="faq.links?.length" class="mt-4">
                      <p class="font-medium">Further reading:</p>
                      <ul class="list-inside list-disc">
                        <li v-for="link in faq.links" :key="link.url">
                          <a :href="link.url" class="inline-flex items-center gap-1 text-primary hover:underline">
                            {{ link.text }}
                            <ExternalLink class="size-3" />
                          </a>
                        </li>
                      </ul>
                    </div>

                    <div class="mt-4 flex items-center gap-4">
                      <p class="text-sm text-muted-foreground">Was this answer helpful?</p>
                      <div class="flex gap-2">
                        <Button variant="outline" size="sm" class="gap-2">
                          <ThumbsUp class="size-4" />
                          Yes
                        </Button>
                        <Button variant="outline" size="sm" class="gap-2">
                          <ThumbsDown class="size-4" />
                          No
                        </Button>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </TransitionGroup>

        <!-- No Results -->
        <div v-if="filteredFaqs.length === 0" class="mt-8 text-center">
          <div class="mb-4 flex justify-center">
            <Search class="size-8 text-muted-foreground" />
          </div>
          <h3 class="mb-2 text-lg font-semibold">No results found</h3>
          <p class="text-muted-foreground">
            Try searching with different keywords or
            <Button variant="link" class="px-1">contact us</Button>
            directly.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>