// DO NOT EDIT. This is code generated via package:intl/generate_localized.dart
// This is a library that looks up messages for specific locales by
// delegating to the appropriate library.

import * as messages_bn_bn from './messages_bn_BN';
import * as messages_ca from './messages_ca';
import * as messages_cs_cz from './messages_cs-CZ';
import * as messages_da from './messages_da';
import * as messages_de_de from './messages_de-DE';
import * as messages_en from './messages_en';
import * as messages_es_ve from './messages_es-VE';
import * as messages_fr_ca from './messages_fr-CA';
import * as messages_fr_fr from './messages_fr-FR';
import * as messages_hi_in from './messages_hi-IN';
import * as messages_hu_hu from './messages_hu-HU';
import * as messages_id_id from './messages_id-ID';
import * as messages_it_it from './messages_it-IT';
import * as messages_ja_jp from './messages_ja-JP';
import * as messages_ml_in from './messages_ml_IN';
import * as messages_nl_nl from './messages_nl-NL';
import * as messages_pl_pl from './messages_pl-PL';
import * as messages_pt_br from './messages_pt-BR';
import * as messages_pt_pt from './messages_pt-PT';
import * as messages_ru_ru from './messages_ru-RU';
import * as messages_tr_tr from './messages_tr-TR';
import * as messages_zh_cn from './messages_zh-CN';
import * as messages_zh_tw from './messages_zh-TW';

export type LibraryLoader = () => Promise<any>;

export const deferredLibraries: Record<string, LibraryLoader> = {
  'bn_BN': () => Promise.resolve(null),
  'ca': () => Promise.resolve(null),
  'cs_CZ': () => Promise.resolve(null),
  'da': () => Promise.resolve(null),
  'de_DE': () => Promise.resolve(null),
  'en': () => Promise.resolve(null),
  'es_VE': () => Promise.resolve(null),
  'fr_CA': () => Promise.resolve(null),
  'fr_FR': () => Promise.resolve(null),
  'hi_IN': () => Promise.resolve(null),
  'hu_HU': () => Promise.resolve(null),
  'id_ID': () => Promise.resolve(null),
  'it_IT': () => Promise.resolve(null),
  'ja_JP': () => Promise.resolve(null),
  'ml_IN': () => Promise.resolve(null),
  'nl_NL': () => Promise.resolve(null),
  'pl_PL': () => Promise.resolve(null),
  'pt_BR': () => Promise.resolve(null),
  'pt_PT': () => Promise.resolve(null),
  'ru_RU': () => Promise.resolve(null),
  'tr_TR': () => Promise.resolve(null),
  'zh_CN': () => Promise.resolve(null),
  'zh_TW': () => Promise.resolve(null),
};

export interface MessageLookup {
  localeName: string;
  messages: Record<string, () => string>;
}

function findExact(localeName: string): MessageLookup | null {
  switch (localeName) {
    case 'bn_BN':
      return messages_bn_bn.messages;
    case 'ca':
      return messages_ca.messages;
    case 'cs_CZ':
      return messages_cs_cz.messages;
    case 'da':
      return messages_da.messages;
    case 'de_DE':
      return messages_de_de.messages;
    case 'en':
      return messages_en.messages;
    case 'es_VE':
      return messages_es_ve.messages;
    case 'fr_CA':
      return messages_fr_ca.messages;
    case 'fr_FR':
      return messages_fr_fr.messages;
    case 'hi_IN':
      return messages_hi_in.messages;
    case 'hu_HU':
      return messages_hu_hu.messages;
    case 'id_ID':
      return messages_id_id.messages;
    case 'it_IT':
      return messages_it_it.messages;
    case 'ja_JP':
      return messages_ja_jp.messages;
    case 'ml_IN':
      return messages_ml_in.messages;
    case 'nl_NL':
      return messages_nl_nl.messages;
    case 'pl_PL':
      return messages_pl_pl.messages;
    case 'pt_BR':
      return messages_pt_br.messages;
    case 'pt_PT':
      return messages_pt_pt.messages;
    case 'ru_RU':
      return messages_ru_ru.messages;
    case 'tr_TR':
      return messages_tr_tr.messages;
    case 'zh_CN':
      return messages_zh_cn.messages;
    case 'zh_TW':
      return messages_zh_tw.messages;
    default:
      return null;
  }
}

let messageLookup: MessageLookup | null = null;

export async function initializeMessages(localeName: string): Promise<boolean> {
  const availableLocale = verifyLocale(localeName);
  if (!availableLocale) {
    return false;
  }
  
  const lib = deferredLibraries[availableLocale];
  if (lib) {
    await lib();
  }
  
  messageLookup = findGeneratedMessagesFor(availableLocale);
  return messageLookup !== null;
}

function messagesExistFor(locale: string): boolean {
  try {
    return findExact(locale) !== null;
  } catch (e) {
    return false;
  }
}

function findGeneratedMessagesFor(locale: string): MessageLookup | null {
  const actualLocale = verifyLocale(locale);
  if (!actualLocale) return null;
  return findExact(actualLocale);
}

function verifyLocale(locale: string): string | null {
  return deferredLibraries[locale] ? locale : null;
}

export function getMessage(key: string): string {
  if (!messageLookup) {
    return key; // Fallback to key if no messages loaded
  }
  
  const messageFunction = messageLookup.messages[key];
  return messageFunction ? messageFunction() : key;
}