import { AlertCircle } from "lucide-react";
import { Button } from "./button";
import Link from "next/link";

interface NotFoundProps {
  title?: string;
  description?: string;
  backUrl?: string;
  backLabel?: string;
}

export function NotFound({
  title = "Page Not Found",
  description = "Sorry, the page you are looking for doesn't exist or is still under development.",
  backUrl = "/dashboard",
  backLabel = "Back to Dashboard"
}: NotFoundProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="bg-red-100 p-4 rounded-full mb-6">
        <AlertCircle className="h-12 w-12 text-red-500" />
      </div>
      <h2 className="text-2xl font-bold font-mono text-[#333] mb-3">
        {title}
      </h2>
      <p className="text-gray-600 font-mono max-w-md mb-6">
        {description}
      </p>
      <Button 
        asChild
        className="border-2 border-[#333] shadow-[0_4px_0_0_#333] font-mono text-white bg-purple-500 hover:bg-purple-600 transform hover:-translate-y-1 hover:shadow-[0_6px_0_0_#333] transition-all duration-200"
      >
        <Link href={backUrl}>
          {backLabel}
        </Link>
      </Button>
    </div>
  );
}
