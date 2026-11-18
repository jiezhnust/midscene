import type { ConversationUserMessage } from '@/ai-model/service-caller/types';
import {
  type TMultimodalPrompt,
  type TUserPrompt,
  userPromptToMultimodalPrompt,
  userPromptToString,
} from '@/common';
import { preProcessImageUrl } from '@midscene/shared/img';

export interface PreparedReferenceImage {
  name: string;
  url: string;
}

export interface PreparedUserPrompt {
  text: string;
  referenceImages: PreparedReferenceImage[];
}

export const prepareReferenceImages = async (
  multimodalPrompt?: TMultimodalPrompt,
): Promise<PreparedReferenceImage[]> => {
  const referenceImages: PreparedReferenceImage[] = [];
  const preparedUrls = new Map<string, string>();
  for (const image of multimodalPrompt?.images ?? []) {
    const url =
      preparedUrls.get(image.url) ??
      (await preProcessImageUrl(
        image.url,
        !!multimodalPrompt?.convertHttpImage2Base64,
      ));
    preparedUrls.set(image.url, url);
    referenceImages.push({
      name: image.name,
      url,
    });
  }
  return referenceImages;
};

export const prepareUserPrompt = async (
  userPrompt: TUserPrompt,
): Promise<PreparedUserPrompt> => ({
  text: userPromptToString(userPrompt),
  referenceImages: await prepareReferenceImages(
    userPromptToMultimodalPrompt(userPrompt),
  ),
});

export const preparedReferenceImagesToMessages = (
  referenceImages: PreparedReferenceImage[],
): ConversationUserMessage[] => {
  if (referenceImages.length === 0) {
    return [];
  }

  return [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Next, I will provide all the reference images. These reference images are supporting context only, not the current screenshot being evaluated, unless the task explicitly asks for comparison or matching.',
        },
      ],
    },
    ...referenceImages.flatMap((image): ConversationUserMessage[] => [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `this is the reference image named '${image.name}'. It is a reference image, not the current screenshot:`,
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'image',
            url: image.url,
          },
        ],
      },
    ]),
  ];
};

export const multimodalPromptToMessages = async (
  multimodalPrompt?: TMultimodalPrompt,
): Promise<ConversationUserMessage[]> =>
  preparedReferenceImagesToMessages(
    await prepareReferenceImages(multimodalPrompt),
  );
