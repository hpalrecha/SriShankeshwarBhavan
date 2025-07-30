import { useState } from "react";
import { Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function FloatingCallButton() {
  const [showOptions, setShowOptions] = useState(false);

  const handleCall = (number: string) => {
    window.location.href = `tel:+91${number}`;
    setShowOptions(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {showOptions && (
        <Card className="mb-4 p-4 bg-white shadow-xl border-2 border-brand-orange">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-900 mb-3">Call Us Now</p>
            <Button
              onClick={() => handleCall('9727070765')}
              className="w-full bg-brand-orange hover:bg-brand-orange-light text-white text-sm"
              size="sm"
            >
              <Phone className="w-4 h-4 mr-2" />
              9727070765
            </Button>
            <Button
              onClick={() => handleCall('9727070766')}
              className="w-full bg-brand-orange hover:bg-brand-orange-light text-white text-sm"
              size="sm"
            >
              <Phone className="w-4 h-4 mr-2" />
              9727070766
            </Button>
            <Button
              onClick={() => setShowOptions(false)}
              variant="ghost"
              size="sm"
              className="w-full text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </Card>
      )}
      
      <Button
        onClick={() => setShowOptions(!showOptions)}
        className="w-14 h-14 rounded-full bg-brand-orange hover:bg-brand-orange-light text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
        size="lg"
      >
        {showOptions ? (
          <X className="w-6 h-6" />
        ) : (
          <Phone className="w-6 h-6" />
        )}
      </Button>
    </div>
  );
}