'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Heading, Text, Spinner, VStack } from '@chakra-ui/react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem('user');
    if (user) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={24}
    >
      <VStack gap={6} textAlign="center">
        <Heading size="4xl" color="blue.600">
          eBay Connector
        </Heading>
        <Text fontSize="xl" color="gray.600">
          Connect and manage your eBay listings
        </Text>
        <VStack gap={4}>
          <Spinner
            size="lg"
            color="blue.500"
          />
          <Text fontSize="sm" color="gray.500">
            Redirecting...
          </Text>
        </VStack>
      </VStack>
    </Box>
  );
}