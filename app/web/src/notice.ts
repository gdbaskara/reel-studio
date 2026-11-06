// A message one page leaves for the next, such as the create page telling the editor which voices failed.
let pending: string | null = null;

export const leaveNotice = (message: string): void => {
  pending = message;
};

export const takeNotice = (): string | null => {
  const message = pending;
  pending = null;
  return message;
};
