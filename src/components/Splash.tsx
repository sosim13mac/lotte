/** 로딩 중 빈 화면. 로고 없이 배경만 보여줍니다. */
export function Splash({ message }: { message?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center">
      {message && <p className="text-sm text-fog-300">{message}</p>}
    </div>
  );
}
