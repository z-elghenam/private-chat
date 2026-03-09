"use client";

import { customAlphabet } from "nanoid";
import { useEffect, useState } from "react";

const ANIMALS = ["wolf", "hog", "bear", "shark"] as const;
const USERNAME_STORAGE_KEY = "chat-username";
const FIVE_DIGIT_ID = customAlphabet("0123456789", 5);

function generateUsername(): string {
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const id = FIVE_DIGIT_ID();
  return `anonymous-${animal}-${id}`;
}

export function useUsername(): string {
  const [username] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    const storedUsername = window.localStorage.getItem(USERNAME_STORAGE_KEY);
    if (storedUsername) {
      return storedUsername;
    }

    return generateUsername();
  });

  useEffect(() => {
    if (!username) {
      return;
    }

    window.localStorage.setItem(USERNAME_STORAGE_KEY, username);
  }, [username]);

  return username;
}
