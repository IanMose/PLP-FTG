import Link from "next/link";

import { Globe } from "lucide-react";

import { APP_CONFIG } from "@/config/app-config";
import { FtgLogo } from "@/components/ftg-logo";

import { LoginForm } from "../../_components/login-form";

export default function LoginV2() {
  return (
    <>
      <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[350px]">
        <div className="space-y-2 text-center">
          <h1 className="font-medium text-3xl">Login to your account</h1>
          <p className="text-muted-foreground text-sm">Please enter your details to login.</p>
        </div>
        <LoginForm />
        {/* Developer company footnote */}
        <div className="flex items-center gap-3 border-t pt-4">
          <p className="w-4/5 text-muted-foreground text-xs leading-relaxed">
            Developed by <span className="font-medium text-foreground">FTG</span> — Future • Technology • Growth
          </p>
          <div className="w-1/5 flex justify-end">
            <FtgLogo className="h-6 w-auto" />
          </div>
        </div>
      </div>

      <div className="absolute top-5 flex w-full justify-end px-10">
        <div className="text-muted-foreground text-sm">
          Don&apos;t have an account?{" "}
          <Link prefetch={false} className="text-foreground" href="register">
            Register
          </Link>
        </div>
      </div>

      <div className="absolute bottom-5 flex w-full justify-between px-10">
        <div className="text-sm">{APP_CONFIG.copyright}</div>
        <div className="flex items-center gap-1 text-sm">
          <Globe className="size-4 text-muted-foreground" />
          ENG
        </div>
      </div>
    </>
  );
}
