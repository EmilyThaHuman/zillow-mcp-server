import React, { useEffect, useRef, useState } from 'react';
import { useWidgetProps } from '../hooks';
import '../styles/index.css';

interface Breakdown {
  principalAndInterest?: number;
  propertyTax?: number;
  insurance?: number;
  pmi?: number;
}

interface Props extends Record<string, unknown> {
  maxHomePrice: number;
  monthlyPayment: number;
  interestRate: number;
  breakdown: Breakdown;
  annualIncome?: number;
  downPayment?: number;
  creditScore?: number;
  monthlyDebts?: number;
  location?: string;
  latitude?: number;
  longitude?: number;
}

declare global {
  interface Window {
    google: any;
  }
}

const ZillowBuyability: React.FC<Partial<Props>> = (externalProps) => {
  const props = useWidgetProps<Props>({
    maxHomePrice: 0,
    monthlyPayment: 0,
    interestRate: 0,
    breakdown: {},
  });

  // Merge external props (for preview mode) with widget props
  const finalProps = { ...props, ...externalProps };

  const {
    maxHomePrice,
    monthlyPayment,
    interestRate,
    breakdown,
    annualIncome,
    downPayment,
    creditScore,
    monthlyDebts,
    location,
    latitude,
    longitude,
  } = finalProps;

  const mapRef = useRef<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    annualIncome: annualIncome || 120000,
    monthlyDebts: monthlyDebts || 500,
    creditScore: creditScore || 715,
    downPayment: downPayment || 40000,
  });
  const [sliderValue, setSliderValue] = useState(monthlyPayment);
  const [calculatedPrice, setCalculatedPrice] = useState(maxHomePrice);

  // Calculate price based on monthly payment
  const calculatePriceFromPayment = (payment: number) => {
    // Simple calculation: assuming 30-year mortgage at 6.5% interest
    // Monthly payment = principal * (rate * (1 + rate)^n) / ((1 + rate)^n - 1)
    // Reverse to get principal: principal = payment * ((1 + rate)^n - 1) / (rate * (1 + rate)^n)
    const rate = (interestRate || 6.5) / 100 / 12;
    const n = 30 * 12;
    const principal = payment * ((Math.pow(1 + rate, n) - 1) / (rate * Math.pow(1 + rate, n)));
    
    // Add down payment to get total price
    const totalPrice = Math.round(principal + (downPayment || 40000));
    return totalPrice;
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPayment = Number(e.target.value);
    setSliderValue(newPayment);
    setCalculatedPrice(calculatePriceFromPayment(newPayment));
  };

  // Initialize Google Maps
  useEffect(() => {
    const initMap = () => {
      const mapElement = document.getElementById('buyability-map');
      if (!mapElement) return;

      const center = {
        lat: latitude || 47.6062,
        lng: longitude || -122.3321,
      };

      const mapStyle = [
        { "featureType": "all", "elementType": "geometry", "stylers": [{ "color": "#162238" }] },
        { "featureType": "all", "elementType": "labels.text.stroke", "stylers": [{ "color": "#0d121a" }, { "weight": 2 }] },
        { "featureType": "all", "elementType": "labels.text.fill", "stylers": [{ "color": "#e6e7e8" }] },
        { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000f26" }] },
        { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#89aae4" }] }
      ];

      mapRef.current = new window.google.maps.Map(mapElement, {
        center,
        zoom: 12,
        styles: mapStyle,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        gestureHandling: 'greedy'
      });

      // Add a marker at the location
      new window.google.maps.Marker({
        position: center,
        map: mapRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#8b5cf6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3
        }
      });
    };

    if (typeof window.google === 'undefined' || !window.google.maps) {
      const script = document.createElement('script');
      script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyDtuTAbw4SXbJelngVprsN0hkIB3TFQ8YY';
      script.async = true;
      script.defer = true;
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }
  }, [latitude, longitude]);

  const hasInputSummary = annualIncome || downPayment || creditScore || monthlyDebts;

  const handleReset = () => {
    setEditValues({
      annualIncome: annualIncome || 120000,
      monthlyDebts: monthlyDebts || 500,
      creditScore: creditScore || 715,
      downPayment: downPayment || 40000,
    });
  };

  const handleSave = () => {
    setIsEditing(false);
    // In a real implementation, this would trigger a recalculation
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Map Container with Calculator Overlay */}
      <div className="relative w-full h-[500px] rounded-3xl overflow-hidden shadow-lg border-2 border-gray-200">
        <div id="buyability-map" className="w-full h-full" />
        
        {/* Expand Button - Top Right */}
        <button className="absolute top-4 right-4 z-20 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
        
        {/* Calculator Overlay - Right Side */}
        <div className="absolute top-0 right-0 w-[480px] h-full bg-white/95 backdrop-blur-sm shadow-2xl overflow-y-auto">
          <div className="p-6 flex flex-col h-full gap-1">
            <div className="text-sm text-gray-700 mb-6">
              BuyAbility<sup className="text-xs">SM</sup> Calculator
            </div>

            <div className="text-2xl font-normal text-gray-900 mb-4 leading-tight">
              Price Point: ${calculatedPrice.toLocaleString()}
            </div>

            {/* Monthly Payment Slider */}
            <div className="flex flex-col gap-3 mb-4">
              <div className={`relative w-full h-1 bg-gray-200 rounded-full overflow-hidden ${isEditing ? 'opacity-50 pointer-events-none' : ''}`}>
                <div 
                  className="absolute h-full bg-gray-400 rounded-full" 
                  style={{ width: `${((sliderValue - 620) / (5000 - 620)) * 100}%` }}
                ></div>
                <input
                  type="range"
                  min="620"
                  max="5000"
                  step="50"
                  value={sliderValue}
                  onChange={handleSliderChange}
                  disabled={isEditing}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-grab active:cursor-grabbing disabled:cursor-not-allowed z-10"
                />
                <div 
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-white border-2 border-gray-400 rounded-full shadow-md pointer-events-none ${isEditing ? '' : ''}`}
                  style={{ left: `${((sliderValue - 620) / (5000 - 620)) * 100}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-700">
                I'm comfortable spending <span className="font-bold underline">${sliderValue.toLocaleString()}</span> per month
              </p>
            </div>

            {/* Assumptions Section */}
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Assumptions</span>
                {!isEditing ? (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="text-blue-600 font-bold text-sm hover:underline"
                  >
                    Edit
                  </button>
                ) : (
                  <button 
                    onClick={handleReset}
                    className="text-gray-700 font-bold text-sm hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>
              
              {!isEditing && hasInputSummary && (
                <div className="flex flex-col gap-2 pt-2">
                  <p className="text-base text-gray-700">
                    {annualIncome && `$${(annualIncome / 1000).toFixed(0)}K income`}
                    {annualIncome && downPayment && ' · '}
                    {downPayment && `$${downPayment.toLocaleString()} down payment`}
                  </p>
                  <p className="text-base text-gray-700">
                    {monthlyDebts && `$${monthlyDebts}/mo debt`}
                    {monthlyDebts && creditScore && ' · '}
                    {creditScore && ` ${Math.floor(creditScore / 20) * 20} - ${Math.floor(creditScore / 20) * 20 + 19} credit score`}
                  </p>
                </div>
              )}

              {/* Edit Form */}
              {isEditing && (
                <div className="mt-3">
                  <form className="grid grid-cols-2 gap-3">
                    {/* Annual Income */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-gray-700">Annual income</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700">$</span>
                        <input
                          type="text"
                          value={formatNumber(editValues.annualIncome)}
                          onChange={(e) => {
                            const val = e.target.value.replace(/,/g, '');
                            if (!isNaN(Number(val))) setEditValues({...editValues, annualIncome: Number(val)});
                          }}
                          className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="80000"
                        />
                      </div>
                    </div>

                    {/* Monthly Debt */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-gray-700">Monthly debt</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700">$</span>
                        <input
                          type="text"
                          value={formatNumber(editValues.monthlyDebts)}
                          onChange={(e) => {
                            const val = e.target.value.replace(/,/g, '');
                            if (!isNaN(Number(val))) setEditValues({...editValues, monthlyDebts: Number(val)});
                          }}
                          className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="1200"
                        />
                      </div>
                    </div>

                    {/* Credit Score */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-gray-700">Credit score</label>
                      <input
                        type="text"
                        value={editValues.creditScore}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!isNaN(Number(val))) setEditValues({...editValues, creditScore: Number(val)});
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="715"
                      />
                    </div>

                    {/* Down Payment */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-gray-700">Down payment</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700">$</span>
                        <input
                          type="text"
                          value={formatNumber(editValues.downPayment)}
                          onChange={(e) => {
                            const val = e.target.value.replace(/,/g, '');
                            if (!isNaN(Number(val))) setEditValues({...editValues, downPayment: Number(val)});
                          }}
                          className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="20000"
                        />
                      </div>
                    </div>
                  </form>

                  {/* Save Button */}
                  <button
                    onClick={handleSave}
                    className="w-full mt-3 py-2 bg-white border-2 border-gray-900 text-gray-900 font-bold text-sm rounded-full hover:bg-gray-50 transition-colors"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>

            {/* Footer - Push to bottom */}
            <div className="text-xs text-gray-500 text-center leading-relaxed mt-auto pt-4">
              Zillow Home Loans is an equal housing lender. NMLS#10287
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZillowBuyability;








