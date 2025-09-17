"use server";

import { generateToken } from "@/utils/generateToken";
import { LanguageBotMap, intrepreterUids } from "@/constants/captionUIDs";


export async function StartCaption(channelName, language, hostUid) {
    const appId = process.env.NEXT_PUBLIC_AGORA_APPID;
    const auth  = process.env.NEXT_PUBLIC_REST_TOKEN;
    const base  = process.env.NEXT_PUBLIC_AGORA_API_URL || "https://api.agora.io";

    const {subId,pubId,langCode} = LanguageBotMap[language];
    const {token:pubToken,uid:pubUid} = await generateToken("PUBLISHER", channelName,pubId);
    const {token:subToken,uid:subUid} = await generateToken("SUBSCRIBER", channelName,subId);


  
    const payload = {
      name: `stt-${Date.now()}`,
      languages: [langCode],
      maxIdleTime: 60,
      rtcConfig: {
        channelName,
        subBotUid: String(subUid),
        pubBotUid: String(pubUid),
        subBotToken: subToken,
        pubBotToken: pubToken,
        subscribeAudioUids: [String(hostUid)]
      },
      translateConfig: {
        languages: [
            {
                source: langCode,
                target: [
                  "en-US"
                ]
            }
        ]
      }
    };
  
    const r = await fetch(`${base}/api/speech-to-text/v1/projects/${appId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify(payload)
    });
  
    const data = await r.json();
    if (!r.ok) return { ok: false, error: data?.error || JSON.stringify(data) };

    return {
      ok: true,
      agentId: data.agent_id || data.agentId,
      pubBotUid: pubUid,
      subBotUid: subUid
    };
}


export async function StopCaption(agentId) {
  if (!agentId) {
    return { ok: false, error: "agentId required" };
  }

  try {
    const appId = process.env.NEXT_PUBLIC_AGORA_APPID;
    const auth  = process.env.NEXT_PUBLIC_REST_TOKEN;
    const base  = process.env.NEXT_PUBLIC_AGORA_API_URL || "https://api.agora.io";

    if (!appId || !auth) {
      return { ok: false, error: "Missing Agora REST config (appId/auth)" };
    }

    const resp = await fetch(
      `${base}/api/speech-to-text/v1/projects/${appId}/agents/${agentId}/leave`,
      {
        method: "POST",
        headers: { Authorization: `Basic ${auth}` },
      }
    );

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return { ok: false, error: text || `Stop failed with ${resp.status}` };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || "Unexpected stop error" };
  }
}

export async function getRTMPUrl(channelName,language) {
  const appId = process.env.NEXT_PUBLIC_AGORA_APPID;
  const auth  = process.env.NEXT_PUBLIC_REST_TOKEN;
  const base  = process.env.NEXT_PUBLIC_AGORA_API_URL || "https://api.agora.io";
  const region = process.env.NEXT_PUBLIC_AGORA_REGION || "eu";

  console.log(intrepreterUids[language].toString(), "intrepreterUids[language]");
  const payload = {
    settings: {
      channel: channelName,
      uid: intrepreterUids[language].toString(),              
      // "expiresAfter": (4 * 60 * 60) // 4 hours
      // "expiresAfter": 400
      expiresAfter: 0
    }
  }
  const resp = await fetch(
    `${base}/${region}/v1/projects/${appId}/rtls/ingress/streamkeys`,
    {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }
  );
  console.log(resp, "resp");
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    return { ok: false, error: text || `Stop failed with ${resp.status}` };
  }

  const data = await resp.json();
  const url = `rtmp://rtls-ingress-prod-eu.agoramdn.com/live/${data.data.streamKey}`;
  return { ok: true, url };
}

// syntax = "proto3";
// package Agora.SpeechToText;

// message Word { string text = 1; bool is_final = 4; }
// message Text { repeated Word words = 10; }
