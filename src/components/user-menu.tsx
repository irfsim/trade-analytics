'use client';

import { Root, Container, Trigger, Content, Item } from 'bloom-menu';

interface UserMenuProps {
  initial?: string;
}

export function UserMenu({ initial = 'U' }: UserMenuProps) {
  return (
    <Root direction="bottom" anchor="end">
      <Container
        className="bloom-no-shadow bg-white"
        buttonSize={36}
        menuWidth={200}
        menuRadius={16}
        buttonRadius={18}
      >
        <Trigger className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
          {initial.toUpperCase()}
        </Trigger>

        <Content className="p-1" style={{ marginBottom: '-8px' }}>
          <Item
            onSelect={() => {}}
            className="w-full px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-100 rounded-lg flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Account
          </Item>
          <Item
            onSelect={() => {}}
            className="w-full px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-100 rounded-lg flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Item>

          <div className="border-t border-zinc-100 my-2 mx-1" />

          <Item
            onSelect={() => {}}
            className="w-full px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-100 rounded-lg flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </Item>
        </Content>
      </Container>
    </Root>
  );
}
