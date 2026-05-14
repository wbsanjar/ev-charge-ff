export type WarningLevel = 'none' | 'first' | 'final' | 'blocked';

export type CancelInfo = {
  count: number;
  warningLevel: WarningLevel;
  canBook: boolean;
  message: string;
};

export function getCancelInfo(cancelCount: number): CancelInfo {
  if (cancelCount >= 4) {
    return {
      count: cancelCount,
      warningLevel: 'blocked',
      canBook: false,
      message: 'Your account has been blocked from booking due to multiple cancellations. Please contact support.',
    };
  }
  if (cancelCount === 3) {
    return {
      count: cancelCount,
      warningLevel: 'final',
      canBook: true,
      message: 'FINAL WARNING: You have cancelled 3 bookings. One more cancellation will block you from booking new slots.',
    };
  }
  if (cancelCount === 2) {
    return {
      count: cancelCount,
      warningLevel: 'first',
      canBook: true,
      message: 'Warning: You have cancelled 2 bookings. One more cancellation will result in a final warning.',
    };
  }
  return {
    count: cancelCount,
    warningLevel: 'none',
    canBook: true,
    message: '',
  };
}
