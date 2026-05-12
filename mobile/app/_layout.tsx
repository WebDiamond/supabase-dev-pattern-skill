// app/_layout.tsx — Root layout con providers e auth guard
import { useEffect }              from 'react'
import { View, ActivityIndicator } from 'react-native'
import { Slot, router, useSegments } from 'expo-router'
import { StripeProvider }            from '@stripe/stripe-react-native'
import { GestureHandlerRootView }    from 'react-native-gesture-handler'
import { SafeAreaProvider }          from 'react-native-safe-area-context'
import { useAuth }   from '../src/hooks/useAuth'
import { useTheme }  from '../src/hooks/useTheme'

export default function RootLayout() {
  const { session, loading } = useAuth()
  const segments = useSegments()
  const theme    = useTheme()

  useEffect(() => {
    if (loading) return
    const inAuth = segments[0] === '(auth)'
    if (!session && !inAuth) router.replace('/(auth)/login')
    if (session  &&  inAuth) router.replace('/(tabs)/home')
  }, [session, loading, segments])

  if (loading) {
    return (
      <View style={{ flex:1, justifyContent:'center', alignItems:'center',
                     backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    )
  }

  return (
    <StripeProvider
      publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
      merchantIdentifier="merchant.com.yourname.myapp"
      urlScheme="myapp"
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <Slot />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </StripeProvider>
  )
}
