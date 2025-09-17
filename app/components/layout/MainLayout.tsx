'use client';

import React from 'react';
import { Flex, HStack } from '@chakra-ui/react';
import Footer from './Footer';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {

  return (
    <HStack w="full" h="100vh" bg="gray.100" padding={10}>
      <Flex
        as="aside"
        w="full"
        h="full"
        maxW={350}
        bg="white"
        alignItems="start"
        padding={6}
        flexDirection="column"
        justifyContent="space-between"
        transition="ease-in-out .2s"
        borderRadius="3xl"
      >
        <Sidebar />
      </Flex>
      <Flex
       as="main"
        w="full"
        direction="column"
        h="full"
        bg="white"
        borderRadius="3xl"
      > 
        {children}

        <Footer />
      </Flex>
    </HStack>
  );
}