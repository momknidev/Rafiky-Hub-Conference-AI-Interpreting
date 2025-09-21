'use client'

import { createContext, useContext, useMemo, useState, useEffect } from 'react'

// Shape of the context value
const ChannelContext = createContext({
  channelName: '',
  setChannelName: () => {},
})

export const ChannelProvider = ({ children}) => {
  const [channelName, setChannelName] = useState('test-channel');
  const [language, setLanguage] = useState('english');


  // useEffect(() => {
  //   setChannelName(`atk-${language}`);
  // },[language])





  const value = useMemo(
    () => ({ channelName, setChannelName, language, setLanguage }),
    [channelName, language]
  )

  return (
    <ChannelContext.Provider value={value}>
      {children}
    </ChannelContext.Provider>
  )
}

export const useChannel = () => useContext(ChannelContext)

export { ChannelContext }


