import Cerebras from '@cerebras/cerebras_cloud_sdk';

const client = new Cerebras({
  apiKey: 'csk-k5h52cj56kc9c54dw5hrph2286w3t9nmwv4x2df8nkfecf89', // This is the default and can be omitted
});


const podcast_transcript = [
    "Hey guys! Welcome back to Tech Unfiltered, I’m Zeeshan, and today we’re talking about something everyone’s thinking about — what will happen to jobs after the rise of AI?",
    "Exactly! Everyone’s worried that ChatGPT and AI tools will automate everything, but the truth is they’re only reducing repetitive work. Creative and strategic jobs still belong to humans.",
    "Right. I believe that those who learn to work with AI will have a secure future.",
    "I mean, if you’re a developer and you integrate AI into your workflow — for example, for code generation, testing, and documentation — you become unbeatable.",
    "Yeah, and I think skills like communication and emotional intelligence will become even more important.",
    "Machines can’t understand empathy, so leadership and people management roles will continue to grow.",
    "Absolutely! And I also think that in the next five years, AI agents will be everywhere — managing your calendars, writing your emails, even handling phone calls.",
    "Haha, I think you’re already building something like that!",
    "Shhh... that’s a surprise! But yes, the goal is to stay productive with AI, not fight against it.",
    "Nice! So if you had to give one tip to our listeners about staying updated in this AI era, what would it be?",
    "Simple — experiment a little with AI tools every day.",
    "Don’t just read the news, use them! That’s how you’ll truly understand how to get the most value from this technology.",
    "That’s powerful. Alright guys, that’s it for today’s short episode — it’s not about surviving with AI, it’s about thriving with it!"
]



const sourceLanguage = 'english';
const targetLanguage = 'italian';

const prompt = `
    You are a professional interpreter who translates text from ${sourceLanguage} to ${targetLanguage}. The tone of the translation should remain the same as the source text.

    Important rules:
    - Do not add any extra text, explanations, or comments. Only provide a JSON response.
    - The JSON response must have the following format:

    Expected response:
    {text: "translated text", language: "${targetLanguage}", original_text: "original text"}

`;

async function main(text) {
  const completionCreateResponse = await client.chat.completions.create({
    messages: [{ role: 'system', content: prompt }, { role: 'user', content: text }],
    model: 'llama-4-scout-17b-16e-instruct',
    response_format: {
      type: 'json_object',
    },
  });

  const response = JSON.parse(completionCreateResponse.choices[0].message.content.toString());
  console.log(`${text} -> ${response.text} -> ${response.language} -> ${response.original_text}\n\n`);
}

for (const text of podcast_transcript) {
  await main(text);
}