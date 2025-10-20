import Cerebras from '@cerebras/cerebras_cloud_sdk';
import {config} from 'dotenv';
config({path: '.env.local'});




const systemPrompt = `
    You are a professional interpreter who translates text from {$sourceLanguage} to {$targetLanguage}. The tone of the translation should remain the same as the source text.

    Important rules:
    - Do not add any extra text, explanations, or comments. Only provide a JSON response.
    - The JSON response must have the following format:

    Expected response:
    {text: "translated text", language: "{$targetLanguage}", original_text: "original text"}

`;



export async function translateTextWithLLM(text, sourceLanguage, targetLanguage, context = [],retry = 0) {
  const apiKeys = [process.env.CEREBRAS_API_KEY, process.env.CEREBRAS_API_KEY_2, process.env.CEREBRAS_API_KEY_3];
  const randomApiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];
  const client = new Cerebras({
    apiKey: randomApiKey,
  });
  

  console.log('context: ', context);
  const prompt = systemPrompt.replace('{$sourceLanguage}', sourceLanguage).replace('{$targetLanguage}', targetLanguage);
  let completionCreateResponse = null;
  try {
  completionCreateResponse = await client.chat.completions.create({
    messages: [{ role: 'system', content: prompt },...context],
    model: 'llama-4-scout-17b-16e-instruct',
    response_format: {
      type: 'json_object',
    },
  });

  } catch (error) {
    console.error('Error translating text with LLM', error);
    if(retry < 3) {
      return translateTextWithLLM(text, sourceLanguage, targetLanguage, context, retry + 1);
    }
    return {
      text: '',
      language: targetLanguage,
      original_text: '',
    };
  }
   
   try {
    const response = JSON.parse(completionCreateResponse.choices[0].message.content.toString());
    return response;
   } catch (error) {
    console.error('Error parsing response from LLM', error);
    if(retry < 3) {
      return translateTextWithLLM(text, sourceLanguage, targetLanguage, context, retry + 1);
    }

    return {
      text: '',
      language: targetLanguage,
      original_text: '',
    };
   }
}
