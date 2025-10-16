import Cerebras from '@cerebras/cerebras_cloud_sdk';
import {config} from 'dotenv';
config({path: '.env.local'});
const client = new Cerebras({
  apiKey: process.env.CEREBRAS_API_KEY,
});



const systemPrompt = `
    You are a professional interpreter who translates text from {$sourceLanguage} to {$targetLanguage}. The tone of the translation should remain the same as the source text.

    Important rules:
    - Do not add any extra text, explanations, or comments. Only provide a JSON response.
    - The JSON response must have the following format:

    Expected response:
    {text: "translated text", language: "{$targetLanguage}", original_text: "original text"}

`;

export async function translateTextWithLLM(text, sourceLanguage, targetLanguage, retry = 0) {
  const prompt = systemPrompt.replace('{$sourceLanguage}', sourceLanguage).replace('{$targetLanguage}', targetLanguage);
  const completionCreateResponse = await client.chat.completions.create({
    messages: [{ role: 'system', content: prompt }, { role: 'user', content: text }],
    model: 'llama-4-scout-17b-16e-instruct',
    response_format: {
      type: 'json_object',
    },
  });
   
   try {
    const response = JSON.parse(completionCreateResponse.choices[0].message.content.toString());
    return response;
   } catch (error) {
    if(retry < 3) {
      return translateTextWithLLM(text, sourceLanguage, targetLanguage, retry + 1);
    }

    return {
      text: '',
      language: targetLanguage,
      original_text: '',
    };
   }
}
