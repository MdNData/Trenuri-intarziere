"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";

interface Stop {
  id: string;
  stationName: string;
  stationKm: number;
  stationOrder: number;
  scheduledArrival: string | null;
  actualArrival: string | null;
  scheduledDeparture: string | null;
  actualDeparture: string | null;
  delayMinutes: number;
  status: string;
  stopDurationMinutes: number;
  isFirstStation: boolean;
  isLastStation: boolean;
  avgDelayMinutes?: number | null;
}

interface Train {
  id: string;
  trainNumber: string;
  trainType: string;
  route: string;
  departureStation: string;
  arrivalStation: string;
  date: string;
  finalDelayMinutes: number;
  status: string;
  stops: Stop[];
  lastScrapedAt: string;
}

interface Params {
  trainNumber: string;
  date: string;
}

interface OperatorInfo {
  name: string;
  email: string;
  phone: string;
}

function getOperatorInfo(trainNumber: string): OperatorInfo {
  const num = parseInt(trainNumber.replace(/\D/g, ""), 10);
  if (isNaN(num)) {
    return {
      name: "CFR Călători",
      email: "petitii@cfrcalatori.ro",
      phone: "021 9521",
    };
  }

  // Softrans: 15930 - 15939
  if (num >= 15930 && num <= 15939) {
    return {
      name: "Softrans",
      email: "info@softrans.ro",
      phone: "0351 409 153",
    };
  }

  // Astra Trans Carpatic: 15520 - 15549
  if (num >= 15520 && num <= 15549) {
    return {
      name: "Astra Trans Carpatic",
      email: "office@astratranscarpatic.ro",
      phone: "021 310 0400",
    };
  }

  // Transferoviar Călători (TFC): 15000 - 15249, 15400 - 15499
  if ((num >= 15000 && num <= 15249) || (num >= 15400 && num <= 15499)) {
    return {
      name: "Transferoviar Călători",
      email: "sesizari@transferoviarcalatori.ro",
      phone: "+40 238 434 380",
    };
  }

  // Regio Călători: 16000 - 16499, 14000 - 14999, 11000 - 11099
  if ((num >= 16000 && num <= 16499) || (num >= 14000 && num <= 14999) || (num >= 11000 && num <= 11099)) {
    return {
      name: "Regio Călători",
      email: "contact@regiocalatori.ro",
      phone: "0310 800 900",
    };
  }

  // Interregional Călători: 16500 - 16599, 15300 - 15399
  if ((num >= 16500 && num <= 16599) || (num >= 15300 && num <= 15399)) {
    return {
      name: "Interregional Călători",
      email: "bilete@viaterra.ro",
      phone: "+40 364 140 245",
    };
  }

  return {
    name: "CFR Călători",
    email: "petitii@cfrcalatori.ro",
    phone: "021 9521",
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export default function TrainDetail({ params }: { params: Promise<Params> }) {
  const resolvedParams = use(params);
  const { trainNumber, date } = resolvedParams;

  const [train, setTrain] = useState<Train | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scraping, setScraping] = useState(false);

  // Live data freshness tracking
  const [dataFetchedAt, setDataFetchedAt] = useState<Date | null>(null);
  const [isDataStale, setIsDataStale] = useState(false);
  
  // Timeline Segment Collapse States
  const [isBeforeExpanded, setIsBeforeExpanded] = useState(false);
  const [isMiddleExpanded, setIsMiddleExpanded] = useState(false);
  const [isAfterExpanded, setIsAfterExpanded] = useState(false);

  // Active Branch State
  const [activeBranchIndex, setActiveBranchIndex] = useState(0);

  // Connection State
  const [hasConnection, setHasConnection] = useState(false);

  // Segment Selection State
  const [selectedDepStation, setSelectedDepStation] = useState("");
  const [selectedArrStation, setSelectedArrStation] = useState("");

  // Calculator and Claim Form State
  const [ticketPrice, setTicketPrice] = useState<string>("");
  const [refundAmount, setRefundAmount] = useState<number | null>(null);
  const [refundPercentage, setRefundPercentage] = useState<number>(0);
  const [passengerName, setPassengerName] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [passengerEmail, setPassengerEmail] = useState("");
  const [passengerCNP, setPassengerCNP] = useState("");
  const [passengerIBAN, setPassengerIBAN] = useState("");
  const [passengerBank, setPassengerBank] = useState("");
  const [passengerSWIFT, setPassengerSWIFT] = useState("");
  const [passengerStreet, setPassengerStreet] = useState("");
  const [passengerCity, setPassengerCity] = useState("");
  const [passengerZip, setPassengerZip] = useState("");
  const [passengerCountry, setPassengerCountry] = useState("Rom\u00e2nia");
  
  // Modal overlay state
  const [isFormVisible, setIsFormVisible] = useState(false);

  // Romanian bank SWIFT/BIC lookup
  const bankSwiftMap: Record<string, string> = {
    "banca transilvania": "BTRLRO22",
    "bt": "BTRLRO22",
    "bcr": "RNCBROBU",
    "banca comerciala romana": "RNCBROBU",
    "ing": "INGBROBU",
    "ing bank": "INGBROBU",
    "brd": "BRDEROBU",
    "brd groupe societe generale": "BRDEROBU",
    "raiffeisen": "RZBRROBU",
    "raiffeisen bank": "RZBRROBU",
    "cec bank": "CECEROBU",
    "cec": "CECEROBU",
    "otp bank": "OTPVROBU",
    "otp": "OTPVROBU",
    "unicredit": "BACXROBU",
    "unicredit bank": "BACXROBU",
    "alpha bank": "BULOROBU",
    "alpha": "BULOROBU",
    "intesa sanpaolo": "WABOROBU",
    "first bank": "PIRBROBU",
    "libra internet bank": "BRELROBU",
    "libra": "BRELROBU",
    "garanti bbva": "UGBIROBU",
    "garanti": "UGBIROBU",
    "eximbank": "EXROROBU",
    "credit europe bank": "FABOROBU",
    "patria bank": "PATRIROBU",
    "vista bank": "MIRBROBU",
    "trezoreria statului": "TABOROBU",
    "revolut": "REVOLT21",
  };

  const handleBankChange = (value: string) => {
    setPassengerBank(value);
    const normalized = value.trim().toLowerCase();
    const foundSwift = bankSwiftMap[normalized];
    if (foundSwift) {
      setPassengerSWIFT(foundSwift);
    }
  };

  // Mobile Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Helper to split stops list into separate branches (based on kilometer drops)
  const getBranches = (stopsList: Stop[]) => {
    const list: Stop[][] = [];
    let current: Stop[] = [];
    for (const s of stopsList) {
      if (current.length > 0 && s.stationKm < current[current.length - 1].stationKm) {
        list.push(current);
        current = [];
      }
      current.push(s);
    }
    if (current.length > 0) {
      list.push(current);
    }
    return list;
  };

  const activeBranchStops = train ? getBranches(train.stops)[activeBranchIndex] || train.stops : [];

  // Chronologically determine if each stop has passed (taking delay into account)
  let lastPassedIdx = -1;
  let isStopPassedList: boolean[] = [];

  if (train && activeBranchStops.length > 0) {
    try {
      const nowInRomaniaStr = new Date().toLocaleString("en-US", { timeZone: "Europe/Bucharest" });
      const nowInRomania = new Date(nowInRomaniaStr);
      const nowTime = nowInRomania.getTime();

      let lastKnownDelay = 0;
      isStopPassedList = activeBranchStops.map((stop) => {
        try {
          const [d, m, y] = train.date.split(".").map(Number);
          const timeStr = stop.scheduledArrival || stop.scheduledDeparture || "00:00";
          const [h, min] = timeStr.split(":").map(Number);
          const firstStop = activeBranchStops[0];
          const [depH] = (firstStop.scheduledDeparture || "00:00").split(":").map(Number);
          let stopDay = d;
          if (h < depH) stopDay += 1;
          const scheduledStopDate = new Date(y, m - 1, stopDay, h, min);

          const effectiveDelay = Math.max(stop.delayMinutes || 0, lastKnownDelay);
          const expectedActualDate = new Date(scheduledStopDate.getTime() + effectiveDelay * 60 * 1000);

          const isPassed = nowTime > expectedActualDate.getTime();
          if (isPassed) {
            lastKnownDelay = effectiveDelay;
          }
          return isPassed;
        } catch (e) {
          return false;
        }
      });

      lastPassedIdx = isStopPassedList.lastIndexOf(true);
    } catch (e) {
      console.error("Error calculating chronological passed stops:", e);
    }
  }

  // Parse scheduled departure and arrival in Romanian timezone context to detect status accurately
  let hasStartedScheduled = false;
  let hasFinishedScheduled = false;
  if (train && activeBranchStops.length > 0) {
    try {
      const nowInRomaniaStr = new Date().toLocaleString("en-US", { timeZone: "Europe/Bucharest" });
      const nowInRomania = new Date(nowInRomaniaStr);
      
      const [d, m, y] = train.date.split(".").map(Number);
      const firstStop = activeBranchStops[0];
      const [depH, depM] = (firstStop.scheduledDeparture || "00:00").split(":").map(Number);
      const scheduledDate = new Date(y, m - 1, d, depH, depM);
      hasStartedScheduled = nowInRomania.getTime() > scheduledDate.getTime();
      
      const lastStop = activeBranchStops[activeBranchStops.length - 1];
      const [arrH, arrM] = (lastStop.scheduledArrival || "23:59").split(":").map(Number);
      let arrDay = d;
      if (arrH < depH) arrDay += 1;
      const scheduledArrivalDate = new Date(y, m - 1, arrDay, arrH, arrM);
      hasFinishedScheduled = nowInRomania.getTime() > scheduledArrivalDate.getTime();
    } catch (e) {
      console.error("Error calculating Romanian timezone times:", e);
    }
  }

  const fetchTrain = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/trains/${trainNumber}/${date}`);
      if (res.status === 404) {
        // Automatically trigger live scrape from CFR
        setScraping(true);
        const scrapeRes = await fetch(`${API_BASE_URL}/api/scrape`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trainNumber, date }),
        });
        const scrapeData = await scrapeRes.json();
        if (scrapeData.success) {
          // Retry fetching the newly saved train
          const resRetry = await fetch(`${API_BASE_URL}/api/trains/${trainNumber}/${date}`);
          if (resRetry.ok) {
            const data = await resRetry.json();
            setTrain(data);
            setDataFetchedAt(new Date());
            setIsDataStale(false);
            if (data && data.stops && data.stops.length > 0) {
              const list = getBranches(data.stops);
              const defaultBranch = list[0] || data.stops;
              setActiveBranchIndex(0);
              setSelectedDepStation(defaultBranch[0].stationName);
              setSelectedArrStation(defaultBranch[defaultBranch.length - 1].stationName);
              calculateRefund(ticketPrice, data, defaultBranch[0].stationName, defaultBranch[defaultBranch.length - 1].stationName);
            }
          } else {
            setTrain(null);
          }
        } else {
          setError(scrapeData.error || "Trenul s-ar putea să nu ruleze în această zi.");
          setTrain(null);
        }
        setScraping(false);
      } else if (!res.ok) {
        throw new Error("Eroare la preluarea datelor de pe server.");
      } else {
        const data = await res.json();
        setTrain(data);
        setDataFetchedAt(new Date());
        setIsDataStale(false);
        if (data && data.stops && data.stops.length > 0) {
          const list = getBranches(data.stops);
          const defaultBranch = list[0] || data.stops;
          setActiveBranchIndex(0);
          setSelectedDepStation(defaultBranch[0].stationName);
          setSelectedArrStation(defaultBranch[defaultBranch.length - 1].stationName);
          calculateRefund(ticketPrice, data, defaultBranch[0].stationName, defaultBranch[defaultBranch.length - 1].stationName);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrain();
  }, [trainNumber, date]);

  // Auto-stale detection: mark data as stale after 10 minutes
  useEffect(() => {
    if (!dataFetchedAt) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - dataFetchedAt.getTime();
      if (elapsed >= 10 * 60 * 1000) {
        setIsDataStale(true);
      }
    }, 30_000); // check every 30s
    return () => clearInterval(interval);
  }, [dataFetchedAt]);

  const handleScrape = async () => {
    setScraping(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:3002/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trainNumber, date }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTrain();
      } else {
        setError(data.error || "Eroare la descărcarea datelor. Trenul s-ar putea să nu ruleze în această zi.");
      }
    } catch (err) {
      setError("Conexiunea la API a eșuat.");
    } finally {
      setScraping(false);
    }
  };

  const calculateRefund = (price: string, currentTrain?: Train | null, dep?: string, arr?: string) => {
    const activeTrain = currentTrain || train;
    if (!activeTrain) return;

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      setRefundAmount(null);
      return;
    }

    const targetArr = arr || selectedArrStation;
    const branchStops = getBranches(activeTrain.stops)[activeBranchIndex] || activeTrain.stops;
    const arrIndex = branchStops.findIndex(s => s.stationName === targetArr);
    if (arrIndex === -1) return;

    const arrStop = branchStops[arrIndex];
    let delay = arrStop.delayMinutes || 0;

    // Propagate delay from the last passed station if the arrival station hasn't been reached yet
    if (lastPassedIdx !== -1 && lastPassedIdx < arrIndex) {
      const lastStop = branchStops[lastPassedIdx];
      delay = Math.max(delay, lastStop.delayMinutes || 0);
    }

    let percentage = 0;
    if (delay >= 120) {
      percentage = 50;
    } else if (delay >= 60) {
      percentage = 25;
    }

    setRefundPercentage(percentage);
    const calculatedRefund = (numericPrice * percentage) / 100;
    setRefundAmount(calculatedRefund);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTicketPrice(e.target.value);
    calculateRefund(e.target.value);
  };

  const handleDepChange = (val: string) => {
    setSelectedDepStation(val);
    
    // Find index of selected departure station within the active branch
    const depIndex = activeBranchStops.findIndex(s => s.stationName === val);
    const arrIndex = activeBranchStops.findIndex(s => s.stationName === selectedArrStation);
    
    // If arrival is before or same as departure, move arrival to the last stop of this branch
    if (arrIndex <= depIndex && activeBranchStops.length > 0) {
      const nextArr = activeBranchStops[activeBranchStops.length - 1].stationName;
      setSelectedArrStation(nextArr);
      calculateRefund(ticketPrice, train, val, nextArr);
    } else {
      calculateRefund(ticketPrice, train, val, selectedArrStation);
    }
  };

  const handleArrChange = (val: string) => {
    setSelectedArrStation(val);
    calculateRefund(ticketPrice, train, selectedDepStation, val);
  };

  const getSelectedSegmentDelay = () => {
    if (!train || activeBranchStops.length === 0) return 0;
    const arrIndex = activeBranchStops.findIndex(s => s.stationName === selectedArrStation);
    if (arrIndex === -1) return 0;

    const arrStop = activeBranchStops[arrIndex];

    // If the train has already passed the arrival station, return its actual delay
    if (lastPassedIdx >= arrIndex) {
      return arrStop.delayMinutes || 0;
    }

    // Otherwise, if the train is in progress, the expected delay is the delay at the last passed station
    if (lastPassedIdx !== -1) {
      const lastStop = activeBranchStops[lastPassedIdx];
      return Math.max(arrStop.delayMinutes || 0, lastStop.delayMinutes || 0);
    }

    return arrStop.delayMinutes || 0;
  };

  // Helper to calculate stop dates and times (taking into account midnight crossing and delays)
  const getStopTimes = (trainDateStr: string, stops: Stop[], index: number) => {
    if (!stops || stops.length === 0 || index < 0 || index >= stops.length) {
      return { scheduledTime: "", scheduledDate: "", scheduledDateShort: "", actualTime: "", actualDate: "", actualDateShort: "", isDelayed: false };
    }
    
    const [d, m, y] = trainDateStr.split(".").map(Number);
    const departureDate = new Date(y, m - 1, d);

    // Let's parse departure time of first station
    const firstStop = stops[0];
    const firstTimeStr = firstStop.scheduledDeparture || "00:00";
    const [firstH, firstM] = firstTimeStr.split(":").map(Number);

    // Current stop
    const currentStop = stops[index];
    const currentTimeStr = currentStop.scheduledArrival || currentStop.scheduledDeparture || "00:00";
    const [currH, currM] = currentTimeStr.split(":").map(Number);

    // Calculate how many days we should shift
    let dayShift = 0;
    let prevHour = firstH;
    let prevMin = firstM;

    for (let i = 1; i <= index; i++) {
      const s = stops[i];
      const timeStr = s.scheduledArrival || s.scheduledDeparture || "00:00";
      const [h, min] = timeStr.split(":").map(Number);
      
      if (h < prevHour || (h === prevHour && min < prevMin)) {
        dayShift++;
      }
      prevHour = h;
      prevMin = min;
    }

    const scheduledDate = new Date(departureDate);
    scheduledDate.setDate(scheduledDate.getDate() + dayShift);
    
    const scheduledDateTime = new Date(
      scheduledDate.getFullYear(),
      scheduledDate.getMonth(),
      scheduledDate.getDate(),
      currH,
      currM
    );

    // Actual time is scheduled + delay
    const actualDateTime = new Date(scheduledDateTime.getTime() + currentStop.delayMinutes * 60 * 1000);

    const formatTime = (dt: Date) => dt.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
    const formatDate = (dt: Date) => dt.toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" });
    const formatDateShort = (dt: Date) => dt.toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit" });

    return {
      scheduledTime: currentTimeStr,
      scheduledDate: formatDate(scheduledDate),
      scheduledDateShort: formatDateShort(scheduledDate),
      actualTime: formatTime(actualDateTime),
      actualDate: formatDate(actualDateTime),
      actualDateShort: formatDateShort(actualDateTime),
      isDelayed: currentStop.delayMinutes > 0,
    };
  };

  // Helper to calculate historically estimated arrival/departure time
  const calculateEstimatedTime = (scheduledTimeStr: string | null, delayMinutes: number) => {
    if (!scheduledTimeStr) return "--:--";
    try {
      const [hours, minutes] = scheduledTimeStr.split(":").map(Number);
      const dateObj = new Date();
      dateObj.setHours(hours, minutes, 0, 0);
      const estimatedDate = new Date(dateObj.getTime() + delayMinutes * 60 * 1000);
      
      const hh = String(estimatedDate.getHours()).padStart(2, "0");
      const mm = String(estimatedDate.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    } catch {
      return scheduledTimeStr;
    }
  };

  // Generate mailto link
  const getMailtoLink = () => {
    if (!train) return "";
    
    const operator = getOperatorInfo(train.trainNumber);
    const subject = encodeURIComponent(`Cerere despăgubire întârziere - Tren ${train.trainType} ${train.trainNumber} / Data ${train.date}`);
    const emailBody = `Stimate domn/doamnă,

Prin prezenta, vă transmit atașată solicitarea mea oficială de despăgubire pentru întârzierea trenului ${train.trainType} ${train.trainNumber} din data de ${train.date}, tronsonul ${selectedDepStation} → ${selectedArrStation}, conform Regulamentului (UE) 2021/782.

Am atașat acestui e-mail formularul completat oficial cu datele mele (nume, CNP, cont IBAN) și copia biletului de călătorie.

Cu stimă,
${passengerName || "[Numele dumneavoastră]"}`;

    return `mailto:${operator.email}?subject=${subject}&body=${encodeURIComponent(emailBody)}`;
  };

  // Generate official print window (PDF printer)
  const generateOfficialPDF = () => {
    if (!train) return;

    const operator = getOperatorInfo(train.trainNumber);
    const depStop = activeBranchStops.find(s => s.stationName === selectedDepStation);
    const arrStop = activeBranchStops.find(s => s.stationName === selectedArrStation);
    const depIndex = activeBranchStops.findIndex(s => s.stationName === selectedDepStation);
    const arrIndex = activeBranchStops.findIndex(s => s.stationName === selectedArrStation);

    const depTimes = getStopTimes(train.date, activeBranchStops, depIndex);
    const arrTimes = getStopTimes(train.date, activeBranchStops, arrIndex);

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Te rugăm să permiți ferestrele pop-up pentru a genera formularul oficial.");
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Cerere Despagubire - Tren ${train.trainType} ${train.trainNumber}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm 20mm;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            line-height: 1.4;
            color: #000;
            margin: 0;
            padding: 0;
            background-color: #fff;
          }
          .logo-container {
            border: 1px solid #002f6c;
            padding: 4px 8px;
            display: inline-block;
            font-family: sans-serif;
            text-align: center;
          }
          .logo-cfr {
            font-size: 16px;
            font-weight: bold;
            color: #002f6c;
            letter-spacing: 2.5px;
            border-bottom: 2px solid #002f6c;
            padding-bottom: 2px;
            display: block;
          }
          .logo-sub {
            font-size: 6.5px;
            color: #002f6c;
            display: block;
            margin-top: 3px;
          }
          .logo-title {
            font-weight: bold;
            font-size: 10px;
            color: #002f6c;
            display: block;
          }
          .top-grid {
            display: table;
            width: 100%;
            margin-bottom: 15px;
          }
          .top-row {
            display: table-row;
          }
          .top-cell-left {
            display: table-cell;
            width: 70%;
            vertical-align: top;
          }
          .top-cell-right {
            display: table-cell;
            width: 30%;
            text-align: right;
            vertical-align: top;
          }
          .verified-box {
            border: 1px solid #000;
            margin-bottom: 20px;
            font-size: 10px;
            text-align: center;
            width: 100%;
          }
          .verified-header {
            border-bottom: 1px solid #000;
            padding: 4px;
            font-weight: bold;
            background-color: #f2f2f2;
            text-transform: uppercase;
          }
          .verified-columns {
            display: table;
            width: 100%;
          }
          .verified-col {
            display: table-cell;
            width: 33.33%;
            border-right: 1px solid #000;
            padding: 10px 4px 20px 4px;
            vertical-align: top;
          }
          .verified-col:last-child {
            border-right: none;
          }
          .title {
            text-align: center;
            font-size: 13px;
            font-weight: bold;
            margin-top: 15px;
            margin-bottom: 20px;
            letter-spacing: 0.5px;
          }
          .section-title {
            font-size: 11px;
            font-weight: bold;
            margin-top: 15px;
            margin-bottom: 8px;
            text-decoration: underline;
            text-transform: capitalize;
          }
          .sub-section-title {
            font-weight: bold;
            font-style: italic;
            margin-top: 8px;
            margin-bottom: 6px;
            display: block;
          }
          .flex-row {
            display: flex;
            margin-bottom: 5px;
            align-items: flex-end;
          }
          .label-text {
            white-space: nowrap;
            padding-right: 4px;
          }
          .dots-line {
            flex-grow: 1;
            border-bottom: 1px dotted #000;
            margin-left: 2px;
            padding-left: 8px;
            font-weight: bold;
            color: #000;
          }
          .checkbox-option {
            margin-top: 6px;
            font-weight: bold;
          }
          .payment-sub-grid {
            margin-left: 15px;
            margin-top: 4px;
          }
          .annex-section {
            margin-top: 15px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .annex-text {
            font-weight: normal;
            font-size: 9.5px;
            margin-top: 4px;
            line-height: 1.3;
          }
          .gdpr-text {
            font-size: 8.5px;
            margin-top: 12px;
            text-align: justify;
            line-height: 1.3;
            color: #333;
          }
          .footer-section {
            margin-top: 30px;
            display: table;
            width: 100%;
          }
          .footer-row {
            display: table-row;
          }
          .footer-cell {
            display: table-cell;
            width: 50%;
            vertical-align: bottom;
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="top-grid">
          <div class="top-row">
            <div class="top-cell-left">
              Unitate primire .........................................................................<br>
              Nr. înregistrare.....................................Data.............................
            </div>
            <div class="top-cell-right">
              ${operator.name === "CFR Călători" ? `
              <div class="logo-container">
                <span class="logo-cfr">CFR</span>
                <span class="logo-sub">Societatea Națională de Transport Feroviar de Călători</span>
                <span class="logo-title">CFR Călători</span>
              </div>
              ` : `
              <div class="logo-container" style="border-color: #555;">
                <span class="logo-cfr" style="color: #333; border-bottom-color: #333;">${operator.name.split(" ")[0]}</span>
                <span class="logo-title" style="color: #333; font-size: 8px; margin-top: 3px;">${operator.name}</span>
              </div>
              `}
            </div>
          </div>
        </div>

        <div class="verified-box">
          <div class="verified-header">
            VERIFICAT DE CĂTRE ȘEF UNITATE*
          </div>
          <div class="verified-columns">
            <div class="verified-col">Numele și prenumele</div>
            <div class="verified-col">Semnătura</div>
            <div class="verified-col">Ștampilă șef unitate</div>
          </div>
        </div>

        <div style="text-align: center; font-weight: bold; margin-bottom: 5px; font-size: 11px; text-transform: uppercase;">
          Trafic Național / Internațional
        </div>
        <div class="title">
          CERERE DE DESPĂGUBIRE PENTRU ÎNTÂRZIEREA TRENULUI
        </div>

        <div class="section-title">1. Detalii despre călătorie</div>
        
        <div class="sub-section-title">Călătoria conform legitimației de călătorie/rezervării achiziționate:</div>
        
        <div class="flex-row">
          <span class="label-text">Data plecării (zi/lună/an):</span>
          <span class="dots-line">${train.date}</span>
        </div>
        <div class="flex-row">
          <span class="label-text">Stația de plecare:</span>
          <span class="dots-line">${selectedDepStation}</span>
        </div>
        <div class="flex-row">
          <span class="label-text">Stația de destinație:</span>
          <span class="dots-line">${selectedArrStation}</span>
        </div>
        <div class="flex-row">
          <span class="label-text">Ora de plecare prevăzută pe legitimația de călătorie/rezervare (oră/minute):</span>
          <span class="dots-line">${depStop?.scheduledDeparture || "--:--"}</span>
        </div>
        <div class="flex-row">
          <span class="label-text">Ora de sosire prevăzută (oră/minute):</span>
          <span class="dots-line">${arrStop?.scheduledArrival || "--:--"}</span>
        </div>
        <div class="flex-row">
          <span class="label-text">Numărul trenului:</span>
          <span class="dots-line">${train.trainType} ${train.trainNumber}</span>
        </div>
        <div class="flex-row">
          <span class="label-text">Numărul legitimației de călătorie / Rezervare:</span>
          <span class="dots-line">${ticketNumber || "______________________________"}</span>
        </div>

        <div class="sub-section-title" style="margin-top: 12px;">Călătoria efectiv realizată:</div>
        
        <div class="flex-row">
          <span class="label-text">Data sosirii (zi/lună/an):</span>
          <span class="dots-line">${arrTimes.actualDate}</span>
        </div>
        <div class="flex-row">
          <span class="label-text">Ora plecării (oră/minute):</span>
          <span class="dots-line">${depStop?.scheduledDeparture || "--:--"}</span>
        </div>
        <div class="flex-row">
          <span class="label-text">Ora sosirii la destinația finală (oră/minute):</span>
          <span class="dots-line">${arrTimes.actualTime} &nbsp;&nbsp;&nbsp;(Întârziere pe tronson: ${arrStop ? arrStop.delayMinutes : 0} min)</span>
        </div>
        <div class="flex-row">
          <span class="label-text">Legătură pierdută în (stație):</span>
          <span class="dots-line">${hasConnection ? "DA" : "NU"}</span>
        </div>
        <div class="flex-row">
          <span class="label-text">Numărul trenului utilizat în locul legăturii pierdute:</span>
          <span class="dots-line">${hasConnection ? "—" : "—"}</span>
        </div>

        <div class="section-title" style="margin-top: 15px;">2. Datele personale ale călătorului</div>
        
        <div class="flex-row">
          <span class="label-text">Nume și Prenume:</span>
          <span class="dots-line">${passengerName}</span>
        </div>
        
        <div class="flex-row">
          <span class="label-text">Adresă: Strada</span>
          <span class="dots-line" style="flex-grow: 3;">${passengerStreet}</span>
          <span class="label-text" style="margin-left: 10px;">Nr.:</span>
          <span class="dots-line" style="flex-grow: 0.5;">—</span>
          <span class="label-text" style="margin-left: 10px;">Țara:</span>
          <span class="dots-line" style="flex-grow: 1.5;">${passengerCountry}</span>
        </div>

        <div class="flex-row">
          <span class="label-text">Oraș:</span>
          <span class="dots-line" style="flex-grow: 3;">${passengerCity}</span>
          <span class="label-text" style="margin-left: 10px;">Cod poștal:</span>
          <span class="dots-line" style="flex-grow: 1.5;">${passengerZip}</span>
        </div>

        <div class="flex-row">
           <span class="label-text">Date de contact: Adresa de e-mail:</span>
           <span class="dots-line" style="flex-grow: 2;">${passengerEmail || "______________________________"}</span>
          <span class="label-text" style="margin-left: 10px;">Număr de telefon:</span>
          <span class="dots-line" style="flex-grow: 1.5;">${passengerPhone}</span>
        </div>

        <div class="checkbox-option">
          [x] Bani
        </div>
        
        <div class="payment-sub-grid">
          <div class="flex-row" style="font-size: 10.5px;">
            <span class="label-text" style="font-style: italic;">• pentru legitimațiile de călătorie achitate cu card bancar: suma va fi virată în contul din care s-a efectuat plata.</span>
          </div>
          <div class="flex-row" style="font-size: 10.5px; margin-top: 2px;">
            <span class="label-text" style="font-style: italic;">• pentru legitimațiile de călătorie achitate cu numerar:</span>
          </div>
          <div class="flex-row" style="margin-left: 10px;">
            <span class="label-text">IBAN (număr de cont):</span>
            <span class="dots-line" style="font-family: monospace; font-size: 11px;">${passengerIBAN}</span>
          </div>
          <div class="flex-row" style="margin-left: 10px;">
            <span class="label-text">SWIFT/BIC (număr de rutare):</span>
            <span class="dots-line">${passengerSWIFT || "—"}</span>
          </div>
          <div class="flex-row" style="margin-left: 10px;">
            <span class="label-text">Banca:</span>
            <span class="dots-line">${passengerBank}</span>
          </div>
          <div class="flex-row" style="margin-left: 10px;">
            <span class="label-text">Moneda:</span>
            <span class="dots-line">RON</span>
          </div>
          <div class="flex-row" style="margin-left: 10px;">
            <span class="label-text">CNP:</span>
            <span class="dots-line">${passengerCNP}</span>
          </div>
          <div class="flex-row" style="margin-left: 10px;">
            <span class="label-text">Numele și prenumele titularului contului:</span>
            <span class="dots-line">${passengerName}</span>
          </div>
        </div>

        <div class="checkbox-option" style="margin-top: 8px;">
          [ ] Voucher
        </div>

        <div class="annex-section">Vă rugăm să anexați documentele relevante</div>
        <div class="annex-text">
          (de exemplu: legitimația de călătorie / legitimațiile de călătorie, rezervarea/rezervările, confirmarea întârzierii trenului și dacă este cazul documentația pentru costurile suplimentare suportate). Valoarea compensației calculate: <strong>${refundPercentage}% &nbsp;&rArr;&nbsp; ${refundAmount ? refundAmount.toFixed(2) : 0} RON</strong>.
        </div>

        <div class="gdpr-text">
          Datele cu caracter personal sunt colectate și prelucrate în scopul acordării despăgubirii pentru întârziere în condițiile stabilite de SNTFC CFR Călători (sau operatorul de transport respectiv). Fundamentul legal: interesul legitim al operatorului conform art.6, alin.1, lit f, din Regulamentul UE 679/2016.
        </div>

        <div class="footer-section">
          <div class="footer-row">
            <div class="footer-cell" style="text-align: left;">
              DATA ...............................
            </div>
            <div class="footer-cell" style="text-align: right; padding-right: 30px;">
              SEMNATURA ...............................
            </div>
          </div>
        </div>

        <div style="font-size: 8px; color: #555; margin-top: 15px; text-align: left;">
          *Doar când se depune în stații/agenții, birouri deschise vânzării în trafic internațional.
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  // Timeline with segment collapsibles
  const renderTimeline = () => {
    if (!train || activeBranchStops.length === 0) return null;

    const depIndex = activeBranchStops.findIndex(s => s.stationName === selectedDepStation);
    const arrIndex = activeBranchStops.findIndex(s => s.stationName === selectedArrStation);

    // Split stops based on selections within active branch
    const stopsBefore = activeBranchStops.slice(0, depIndex);
    const depStop = activeBranchStops[depIndex];
    const stopsMiddle = activeBranchStops.slice(depIndex + 1, arrIndex);
    const arrStop = activeBranchStops[arrIndex];
    const stopsAfter = activeBranchStops.slice(arrIndex + 1);

const renderStopNode = (stop: Stop, indexInFullList: number, isSpecialLabel?: string) => {
      const stopTimes = getStopTimes(train.date, activeBranchStops, indexInFullList);
      const isDep = indexInFullList === depIndex;
      const isArr = indexInFullList === arrIndex;

      // A stop is future if it is after the last passed stop
      const isFutureStop = indexInFullList > lastPassedIdx;
      const isCurrentPosition = lastPassedIdx !== -1 && indexInFullList === lastPassedIdx;

      return (
        <div 
          key={stop.id} 
          className={`timeline-node transition-all duration-300 ${
            isDep ? "border border-cyan-500/30 bg-cyan-950/20 p-4 rounded-2xl shadow-md my-2" : 
            isArr ? "border border-blue-500/30 bg-blue-950/20 p-4 rounded-2xl shadow-md my-2" : 
            isCurrentPosition ? "pb-3 pl-1 border border-cyan-500/20 bg-cyan-950/10 p-3 rounded-xl my-1" :
            "pb-3 pl-1"
          } ${isFutureStop && !isDep && !isArr ? "opacity-50" : ""}`}
          style={{ paddingBottom: isDep || isArr ? '1rem' : '0.45rem' }}
        >
          <span className={`timeline-dot ${
            isDep || isArr ? "border-cyan-400 border-4 w-3.5 h-3.5 left-[-1.68rem] top-[1.2rem] bg-zinc-950 animate-pulse-glow" : 
            stop.isFirstStation || indexInFullList === 0 ? "first-stop" : 
            stop.isLastStation || indexInFullList === activeBranchStops.length - 1 ? "last-stop" : 
            "w-2.5 h-2.5 left-[-1.58rem] top-1.5"
          } ${stop.delayMinutes > 0 ? "delayed" : "on-time"}`} />
          
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4 text-sm">
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`font-bold ${isDep || isArr ? "text-base text-zinc-100" : "text-sm text-zinc-300"}`}>
                  {stop.stationName}
                </span>
                <span className="text-[11px] text-zinc-500 shrink-0">Km {stop.stationKm}</span>
                {isSpecialLabel && (
                  <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                    isDep ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : 
                    "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  }`}>
                    {isSpecialLabel}
                  </span>
                )}
              </div>
              
              {/* Train Status Badges based on active location tracking */}
              {isCurrentPosition && (
                indexInFullList === activeBranchStops.length - 1 ? (
                  <div className="text-[11px] text-green-400 font-bold mt-1 flex items-center gap-1.5 bg-green-950/20 border border-green-500/20 px-2 py-0.5 rounded w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                    <span>Tren sosit la destinație</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-cyan-400 font-bold mt-1 flex items-center gap-1.5 bg-cyan-950/20 border border-cyan-500/20 px-2 py-0.5 rounded w-fit animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                    <span>Ultima poziție raportată</span>
                  </div>
                )
              )}
 
              {(isDep || isArr) && (
                <p className="text-[11px] text-zinc-500 mt-0.5 font-medium">
                  {isDep ? "Stația unde ai urcat în tren" : "Stația unde ai coborât din tren"}
                </p>
              )}
              {stop.avgDelayMinutes !== undefined && stop.avgDelayMinutes !== null && stop.avgDelayMinutes > 0 && (
                <div className="text-[11px] text-zinc-500 mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 animate-fade-in leading-relaxed">
                  <svg className="w-3.5 h-3.5 text-amber-500/70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                  </svg>
                  <span>
                    De obicei întârzie <strong className="text-amber-400">~{stop.avgDelayMinutes}m</strong>
                  </span>
                  {(!stop.actualArrival && !stop.actualDeparture) && (
                    <span className="text-zinc-600">
                      (Estimare: <strong className="text-zinc-400">~{calculateEstimatedTime(stopTimes.scheduledTime, stop.avgDelayMinutes)}</strong>)
                    </span>
                  )}
                </div>
              )}
            </div>
 
            <div className="text-left sm:text-right text-[12px] sm:text-[13px] text-zinc-400 font-medium flex flex-wrap sm:flex-col items-center sm:items-end gap-x-3 gap-y-0.5 mt-1 sm:mt-0">
              <div>
                <span className="text-zinc-500 text-[11px]">Planificat:</span> <span className="font-semibold text-zinc-300">{stopTimes.scheduledTime}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-zinc-500 text-[11px]">{isFutureStop ? "⏳ Previziune CFR:" : "✓ Confirmat:"}</span>{" "}
                <span className={stopTimes.isDelayed ? "text-red-400 font-bold" : "text-green-400"}>
                  {stopTimes.actualTime}
                </span>
                {stop.delayMinutes > 0 && (
                  <span className="text-red-400 text-[11px] font-bold bg-red-500/10 px-1.5 py-0.5 rounded">
                    +{stop.delayMinutes}m
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="timeline pl-6 space-y-3.5">
        {/* 1. STATIONS BEFORE DEPARTURE (COLLAPSIBLE) */}
        {stopsBefore.length > 0 && (
          <div className="timeline-segment animate-fade-in">
            {!isBeforeExpanded ? (
              <div className="timeline-node pb-2" style={{ paddingBottom: '0.4rem' }}>
                <span className="timeline-dot bg-zinc-800 border-zinc-700 w-2.5 h-2.5 left-[-1.58rem] top-3.5 shadow-none" />
                <button
                  onClick={() => setIsBeforeExpanded(true)}
                  className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 hover:border-zinc-700 transition-all text-zinc-400 flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-zinc-555" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Afișează stațiile anterioare traseului tău ({stopsBefore.length})
                </button>
              </div>
            ) : (
              <div className="space-y-3.5 animate-fade-in">
                <div className="timeline-node pb-2" style={{ paddingBottom: '0.4rem' }}>
                  <span className="timeline-dot bg-zinc-800 border-zinc-700 w-2.5 h-2.5 left-[-1.58rem] top-3.5 shadow-none" />
                  <button
                    onClick={() => setIsBeforeExpanded(false)}
                    className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 hover:border-zinc-700 transition-all text-zinc-400 flex items-center gap-1.5 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 text-zinc-555" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    Ascunde stațiile anterioare
                  </button>
                </div>
                {stopsBefore.map((stop, idx) => renderStopNode(stop, idx))}
              </div>
            )}
          </div>
        )}

        {/* 2. BOARDING STATION (HIGHLIGHTED) */}
        {depStop && renderStopNode(depStop, depIndex, "Urcarea Ta")}

        {/* 3. INTERMEDIATE STOPS ON SEGMENT (COLLAPSIBLE) */}
        {stopsMiddle.length > 0 && (
          <div className="timeline-segment animate-fade-in">
            {!isMiddleExpanded ? (
              <div className="timeline-node pb-2" style={{ paddingBottom: '0.4rem' }}>
                <span className="timeline-dot bg-zinc-800 border-zinc-700 w-2.5 h-2.5 left-[-1.58rem] top-3.5 shadow-none" />
                <button
                  onClick={() => setIsMiddleExpanded(true)}
                  className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-zinc-900 border border-zinc-850 hover:bg-zinc-855 hover:border-zinc-700 transition-all text-zinc-400 flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-zinc-555" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Afișează opririle intermediare din călătoria ta ({stopsMiddle.length})
                </button>
              </div>
            ) : (
              <div className="space-y-3.5 animate-fade-in">
                <div className="timeline-node pb-2" style={{ paddingBottom: '0.4rem' }}>
                  <span className="timeline-dot bg-zinc-800 border-zinc-700 w-2.5 h-2.5 left-[-1.58rem] top-3.5 shadow-none" />
                  <button
                    onClick={() => setIsMiddleExpanded(false)}
                    className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-zinc-900 border border-zinc-850 hover:bg-zinc-855 hover:border-zinc-700 transition-all text-zinc-400 flex items-center gap-1.5 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 text-zinc-555" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    Ascunde opririle intermediare
                  </button>
                </div>
                {stopsMiddle.map((stop, idx) => renderStopNode(stop, depIndex + 1 + idx))}
              </div>
            )}
          </div>
        )}

        {/* 4. DESTINATION STATION (HIGHLIGHTED) */}
        {arrStop && renderStopNode(arrStop, arrIndex, "Coborârea Ta")}

        {/* 5. STATIONS AFTER DESTINATION (COLLAPSIBLE) */}
        {stopsAfter.length > 0 && (
          <div className="timeline-segment animate-fade-in">
            {!isAfterExpanded ? (
              <div className="timeline-node pb-2" style={{ paddingBottom: '0.4rem' }}>
                <span className="timeline-dot bg-zinc-800 border-zinc-700 w-2.5 h-2.5 left-[-1.58rem] top-3.5 shadow-none" />
                <button
                  onClick={() => setIsAfterExpanded(true)}
                  className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 hover:border-zinc-700 transition-all text-zinc-400 flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-zinc-555" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Afișează stațiile ulterioare traseului tău ({stopsAfter.length})
                </button>
              </div>
            ) : (
              <div className="space-y-3.5 animate-fade-in">
                <div className="timeline-node pb-2" style={{ paddingBottom: '0.4rem' }}>
                  <span className="timeline-dot bg-zinc-800 border-zinc-700 w-2.5 h-2.5 left-[-1.58rem] top-3.5 shadow-none" />
                  <button
                    onClick={() => setIsAfterExpanded(false)}
                    className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 hover:border-zinc-700 transition-all text-zinc-400 flex items-center gap-1.5 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 text-zinc-555" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    Ascunde stațiile ulterioare
                  </button>
                </div>
                {stopsAfter.map((stop, idx) => renderStopNode(stop, arrIndex + 1 + idx))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderCalculatorForm = () => {
    if (!train) return null;

    const segmentDelay = getSelectedSegmentDelay();
    
    // Dynamically filter options bidirectionally
    const depIndex = activeBranchStops.findIndex(s => s.stationName === selectedDepStation);
    const arrIndex = activeBranchStops.findIndex(s => s.stationName === selectedArrStation);
    
    const arrivalOptions = activeBranchStops.slice(depIndex + 1);
    const departureOptions = activeBranchStops.slice(0, arrIndex);

    const branches = getBranches(train.stops);

    return (
      <div className="space-y-5">
        <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            Calculează Compensația
          </h2>
          {isDrawerOpen && (
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="text-zinc-555 hover:text-zinc-300 text-xs font-bold cursor-pointer md:hidden flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Închide
            </button>
          )}
        </div>

        {/* Branch Selector (Direct Carriage Groups) */}
        {branches.length > 1 && (
          <div className="space-y-2 p-3.5 bg-zinc-900/50 border border-zinc-850 rounded-xl">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Grupă Vagoane / Ramură</span>
            <div className="flex flex-col gap-2">
              {branches.map((b, idx) => {
                const label = `${b[0].stationName} → ${b[b.length - 1].stationName}`;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveBranchIndex(idx);
                      const nextDep = b[0].stationName;
                      const nextArr = b[b.length - 1].stationName;
                      setSelectedDepStation(nextDep);
                      setSelectedArrStation(nextArr);
                      
                      // Collapse all expandables on branch change
                      setIsBeforeExpanded(false);
                      setIsMiddleExpanded(false);
                      setIsAfterExpanded(false);

                      calculateRefund(ticketPrice, train, nextDep, nextArr);
                    }}
                    className={`w-full text-left py-2 px-3 rounded-lg text-xs font-bold transition-all border flex justify-between items-center ${
                      activeBranchIndex === idx
                        ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-md"
                        : "bg-zinc-950/40 text-zinc-400 border-zinc-850 hover:bg-zinc-900"
                    }`}
                  >
                    <span>{label}</span>
                    <span className="text-[9px] text-zinc-550 font-normal">({b.length} stații)</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tronson/Segment Selector */}
        <div className="space-y-3 bg-zinc-900/50 p-4 rounded-xl border border-zinc-850">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tronsonul călătorit</h3>
            <button
              onClick={() => {
                const first = activeBranchStops[0].stationName;
                const last = activeBranchStops[activeBranchStops.length - 1].stationName;
                setSelectedDepStation(first);
                setSelectedArrStation(last);
                calculateRefund(ticketPrice, train, first, last);
              }}
              className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              Resetează la capete
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <label htmlFor="dep-station" className="text-[10px] text-zinc-500 font-semibold uppercase">Stație Plecare</label>
              <select
                id="dep-station"
                value={selectedDepStation}
                onChange={(e) => handleDepChange(e.target.value)}
                className="w-full text-sm font-semibold text-zinc-200"
              >
                {departureOptions.map((s) => (
                  <option key={`dep-${s.id}`} value={s.stationName} className="bg-zinc-900 font-normal">
                    {s.stationName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="arr-station" className="text-[10px] text-zinc-500 font-semibold uppercase">Stație Sosire</label>
              <select
                id="arr-station"
                value={selectedArrStation}
                onChange={(e) => handleArrChange(e.target.value)}
                className="w-full text-sm font-semibold text-zinc-200"
              >
                {arrivalOptions.map((s) => (
                  <option key={`arr-${s.id}`} value={s.stationName} className="bg-zinc-900 font-normal">
                    {s.stationName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Segment Details Summary */}
          {(() => {
            const depStopObj = activeBranchStops.find((s) => s.stationName === selectedDepStation);
            const arrStopObj = activeBranchStops.find((s) => s.stationName === selectedArrStation);
            const depIdx = activeBranchStops.findIndex((s) => s.stationName === selectedDepStation);
            const arrIdx = activeBranchStops.findIndex((s) => s.stationName === selectedArrStation);
            const depTimes = getStopTimes(train.date, activeBranchStops, depIdx);
            const arrTimes = getStopTimes(train.date, activeBranchStops, arrIdx);

            if (!depStopObj || !arrStopObj) return null;

            return (
              <div className="pt-3 border-t border-zinc-800/80 space-y-2 text-xs leading-relaxed">
                <div className="flex justify-between">
                  <span className="text-zinc-550">Distanță segment:</span>
                  <span className="font-semibold text-zinc-300">
                    {arrStopObj.stationKm - depStopObj.stationKm} km ({depStopObj.stationKm} → {arrStopObj.stationKm})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-555">Plecare planificată:</span>
                  <span className="font-semibold text-zinc-300">
                    {depTimes.scheduledTime} ({depTimes.scheduledDateShort})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-555">Sosire planificată:</span>
                  <span className="font-semibold text-zinc-300">
                    {arrTimes.scheduledTime} ({arrTimes.scheduledDateShort})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-555">Sosire reală la destinație:</span>
                  <span className={`font-semibold ${arrTimes.isDelayed ? "text-red-400" : "text-green-400"}`}>
                    {arrTimes.actualTime} ({arrTimes.actualDateShort})
                  </span>
                </div>
                
                <div className="pt-2 border-t border-zinc-800/50 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Așteptare la plecare:</span>
                    <span className={`font-bold text-[11px] px-1.5 py-0.5 rounded ${depStopObj.delayMinutes > 0 ? "text-amber-400 bg-amber-500/10" : "text-green-400 bg-green-500/10"}`}>
                      {depStopObj.delayMinutes > 0 ? `${depStopObj.delayMinutes} min` : "La timp"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Întârziere la sosire:</span>
                    <span className={`font-bold text-[11px] px-1.5 py-0.5 rounded ${arrStopObj.delayMinutes > 0 ? "text-red-400 bg-red-500/10" : "text-green-400 bg-green-500/10"}`}>
                      {arrStopObj.delayMinutes > 0 ? `${arrStopObj.delayMinutes} min` : "La timp"}
                    </span>
                  </div>
                </div>

                {/* Train connection / transfer split direct carriage helper */}
                <div className="pt-2.5 border-t border-zinc-800/60 space-y-2">
                  <label className="flex items-center gap-2 text-[10.5px] font-semibold text-zinc-300 cursor-pointer select-none hover:text-zinc-200 transition-colors">
                    <input
                      type="checkbox"
                      checked={hasConnection}
                      onChange={(e) => setHasConnection(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-955 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-zinc-900 shrink-0 w-3.5 h-3.5"
                    />
                    Călătorie cu legătură (schimbare tren / vagon)
                  </label>
                  {hasConnection && (
                    <div className="p-3 rounded-lg bg-blue-955/20 border border-blue-800/25 text-[10px] text-zinc-400 leading-normal animate-fade-in space-y-1">
                      <p>
                        <strong>Regulament (UE):</strong> Dacă ai avut bilet cu legătură emis ca un singur contract, întârzierile se cumulează. Completează în câmpul de preț prețul total al biletului, iar compensația va fi stabilită pe baza întârzierii înregistrate la sosirea ta finală.
                      </p>
                      <p className="text-zinc-500 text-[9px]">
                        * Dacă trenurile au fost cumpărate pe bilete separate nelegate, compensația se solicită separat pentru fiecare tren care a avut întârziere ≥ 60m.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
        
        {segmentDelay < 60 ? (
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-850 text-zinc-400 text-xs leading-relaxed">
            Trenul a avut o întârziere de doar <strong>{segmentDelay} minute</strong> la stația de sosire selectată (sub pragul legal de 60 de minute). Conform reglementărilor UE, nu se pot solicita despăgubiri pentru această călătorie.
          </div>
        ) : (
          <div className="space-y-5 animate-fade-in">
            {/* Step 1: Preț and Ticket Number are always visible when eligible */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="price" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Preț Bilet (RON)
                </label>
                <input
                  id="price"
                  type="number"
                  placeholder="Ex: 120"
                  value={ticketPrice}
                  onChange={handlePriceChange}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="ticket-no" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Cod Bilet
                </label>
                <input
                  id="ticket-no"
                  type="text"
                  placeholder="Ex: CFR-92"
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                />
              </div>
            </div>

            {refundAmount !== null && (
              <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-850 flex justify-between items-center animate-fade-in">
                <div>
                  <div className="text-[10px] text-zinc-555 uppercase tracking-wider">Compensație ({refundPercentage}%)</div>
                  <div className="text-2xl font-bold text-cyan-400 mt-0.5">{refundAmount.toFixed(2)} RON</div>
                </div>
                {refundAmount < 20 ? (
                  <div className="text-xs text-yellow-400 max-w-[150px] text-right font-medium flex items-center gap-1 justify-end">
                    <svg className="w-4 h-4 text-yellow-505 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Sub limita de 4€
                  </div>
                ) : (
                  <div className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Eligibil
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsFormVisible(true)}
              className="w-full py-3.5 rounded-xl font-bold text-zinc-950 bg-gradient-to-r from-blue-400 to-cyan-400 hover:from-blue-300 hover:to-cyan-300 transition-all shadow-lg hover:shadow-cyan-500/10 cursor-pointer text-center text-sm active:scale-[0.98] transform"
            >
              Completează cererea de despăgubire
            </button>
          </div>
        )}
      </div>
    );
  };

  const lastStopIndex = activeBranchStops ? activeBranchStops.length - 1 : 0;
  const departureTimes = train ? getStopTimes(train.date, activeBranchStops, 0) : null;
  const finalTimes = train ? getStopTimes(train.date, activeBranchStops, lastStopIndex) : null;
  const segmentDelay = getSelectedSegmentDelay();

  const depIdx = activeBranchStops.findIndex((s) => s.stationName === selectedDepStation);
  const arrIdx = activeBranchStops.findIndex((s) => s.stationName === selectedArrStation);
  const depTimes = train ? getStopTimes(train.date, activeBranchStops, depIdx) : null;
  const arrTimes = train ? getStopTimes(train.date, activeBranchStops, arrIdx) : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(34,211,238,0.16),_transparent_24%)]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-3 pb-24 pt-3 sm:px-6 sm:pt-4 md:px-8">
      {/* Header */}
      <header className="sticky top-2 z-20 mb-3 rounded-2xl border border-zinc-900/80 bg-zinc-950/80 px-3 py-3 backdrop-blur-xl sm:px-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <img src="/logo.jpg" alt="Logo TrenÎntârziat" className="h-10 w-10 rounded-full border border-zinc-800 object-cover transition-all group-hover:border-cyan-500/50 sm:h-12 sm:w-12" />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-base font-extrabold tracking-tight text-transparent sm:text-xl md:text-2xl">
              Tren-Întârziat.ro
            </span>
          </Link>
          <Link href="/" className="rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-sm font-semibold text-zinc-300 transition-colors hover:border-cyan-500/30 hover:text-white">
            ← Nouă Căutare
          </Link>
        </div>
      </header>

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-10 h-10 rounded-full border-2 border-zinc-800 border-t-cyan-400 animate-spin"></div>
          <p className="text-zinc-550 text-xs tracking-wider uppercase font-semibold">
            {scraping ? "Se descarcă datele live de la CFR..." : "Se încarcă datele trenului..."}
          </p>
        </div>
      )}

      {/* Error / Scrape Failure State */}
      {!loading && !train && (
        <div className="flex-1 py-16 space-y-6 text-center animate-fade-in">
          <div className="flex justify-center">
            <svg className="w-12 h-12 text-zinc-650" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl md:text-2xl font-bold">Trenul nu a fost găsit</h1>
          <p className="text-zinc-400 max-w-md mx-auto text-sm">
            Am încercat să căutăm și să descărcăm live datele pentru trenul <strong className="text-zinc-200">{trainNumber}</strong> din data de <strong className="text-zinc-200">{date}</strong>, dar trenul s-ar putea să nu ruleze în această zi sau CFR nu mai deține istoricul lui.
          </p>
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-xs text-red-400 max-w-md mx-auto">
              {error}
            </div>
          )}
          <div className="pt-4">
            <Link
              href="/"
              className="px-6 py-3 rounded-xl font-bold text-zinc-950 bg-gradient-to-r from-blue-400 to-cyan-400 hover:from-blue-300 hover:to-cyan-300 transition-all shadow-lg hover:shadow-cyan-500/10 cursor-pointer text-sm"
            >
              Înapoi la căutare
            </Link>
          </div>
        </div>
      )}

      {/* Show Train Detail if Found */}
      {!loading && train && (
        <div className="flex-1 flex flex-col gap-6 animate-fade-in">
          {/* Summary Card */}
          <div className="glass-card relative overflow-hidden border border-zinc-850 p-4 sm:p-6">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-500 to-cyan-400"></div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase text-blue-400">
                    {train.trainType}
                  </span>
                  <h1 className="text-2xl font-extrabold text-zinc-100">{train.trainNumber}</h1>
                  <span className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[9px] font-bold uppercase text-zinc-400">
                    Rută completă: {train.route}
                  </span>
                </div>

                <p className="flex flex-wrap items-center gap-2 text-lg font-extrabold text-cyan-400">
                  Călătoria Ta: {selectedDepStation} → {selectedArrStation}
                </p>

                {depTimes && arrTimes && (
                  <div className="grid max-w-lg gap-4 border-t border-zinc-800 pt-4 text-xs leading-relaxed sm:grid-cols-2 sm:gap-6">
                    <div>
                      <span className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-555">Plecare</span>
                      <span className="mt-1 block font-bold text-zinc-350">{selectedDepStation}</span>
                      <span className="mt-0.5 block text-zinc-400">
                        {depTimes.scheduledDate} la {depTimes.scheduledTime}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-555">Sosire (Efectivă)</span>
                      <span className="mt-1 block font-bold text-zinc-350">{selectedArrStation}</span>
                      <span className={`mt-0.5 block font-extrabold ${arrTimes.isDelayed ? "text-red-400" : "text-green-400"}`}>
                        {arrTimes.actualTime} ({arrTimes.actualDateShort})
                      </span>
                      <span className="mt-0.5 block text-[10px] text-zinc-550">
                        Planificat: {arrTimes.scheduledTime} ({arrTimes.scheduledDateShort})
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex w-full flex-col items-start border-t border-zinc-800 pt-4 text-left sm:w-auto sm:items-end sm:border-t-0 sm:pt-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Întârziere Călătorie</div>
                <div className={`mt-1 text-4xl font-extrabold ${segmentDelay > 0 ? "text-red-400" : "text-green-400"}`}>
                  {segmentDelay} <span className="text-lg font-normal">min</span>
                </div>
                <span className={`badge mt-2 ${segmentDelay >= 60 ? "badge-danger" : "badge-success"}`}>
                  {segmentDelay >= 60 ? "Eligibil Compensare" : "Sub 60 min"}
                </span>
                <p className="mt-2 max-w-[220px] text-right text-[11px] font-medium leading-snug sm:text-right">
                  {segmentDelay > 0 && segmentDelay < 60 && <span className="text-amber-400">Sub pragul de compensare (60 min).</span>}
                  {segmentDelay >= 60 && segmentDelay < 120 && <span className="text-orange-400">Ai dreptul la 25% din prețul biletului înapoi!</span>}
                  {segmentDelay >= 120 && <span className="text-red-400">Ai dreptul la 50% din prețul biletului înapoi!</span>}
                </p>

                <span className="mt-2 block text-[10px] font-medium text-zinc-500">
                  Întârziere totală tren: {train.finalDelayMinutes} min
                </span>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] sm:justify-end">
                  {isDataStale ? (
                    <span className="flex items-center gap-1 text-amber-400">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                      Date vechi — actualizează
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-green-400">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-400 animate-pulse" />
                      Date live
                    </span>
                  )}
                  <button
                    onClick={handleScrape}
                    disabled={scraping}
                    className="flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 font-bold uppercase tracking-wider text-[8px] text-zinc-300 transition-all hover:border-zinc-700 hover:bg-zinc-850 hover:text-cyan-400 disabled:opacity-50"
                  >
                    {scraping ? (
                      <span className="h-2.5 w-2.5 shrink-0 animate-spin rounded-full border-2 border-zinc-700 border-t-cyan-400" />
                    ) : (
                      <svg className="h-2.5 w-2.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.21" />
                      </svg>
                    )}
                    {scraping ? "Se actualizează..." : "Actualizează"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="md:hidden rounded-2xl border border-zinc-850 bg-zinc-900/50 p-3 shadow-lg shadow-black/10">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
              Selezionează stațiile pentru a vedea tronsonul
            </p>
            <div className="space-y-2">
              <div className="space-y-1">
                <label htmlFor="mobile-dep-station" className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Plecare</label>
                <select
                  id="mobile-dep-station"
                  value={selectedDepStation}
                  onChange={(e) => handleDepChange(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-3 text-sm font-semibold text-zinc-100 shadow-inner"
                >
                  {activeBranchStops.map((s) => (
                    <option key={`mobile-dep-${s.id}`} value={s.stationName} className="bg-zinc-900 font-normal">
                      {s.stationName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="mobile-arr-station" className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Sosire</label>
                <select
                  id="mobile-arr-station"
                  value={selectedArrStation}
                  onChange={(e) => handleArrChange(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-3 text-sm font-semibold text-zinc-100 shadow-inner"
                >
                  {activeBranchStops.map((s) => (
                    <option key={`mobile-arr-${s.id}`} value={s.stationName} className="bg-zinc-900 font-normal">
                      {s.stationName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* TWO COLUMN GRID FOR DESKTOP */}
          <div className="mt-4 grid items-start gap-4 md:mt-0 md:grid-cols-5 md:gap-6">
            {/* Timeline - takes 3 columns */}
            <div className="glass-card border border-zinc-850 p-4 space-y-4 sm:p-6 md:col-span-3">
              <h2 className="text-lg font-bold sm:text-xl">Traseul trenului și stații</h2>
              
              {/* Journey Progress Bar */}
              {(() => {
                const totalStops = activeBranchStops.length;
                const completedStops = lastPassedIdx + 1;
                const pct = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0;
                return (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[11px] font-semibold">
                      <span className="text-zinc-400">{completedStops}/{totalStops} stații parcurse</span>
                      <span className={pct === 100 ? "text-green-400" : "text-cyan-400"}>{pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          pct === 100 ? "bg-gradient-to-r from-green-500 to-emerald-400" : "bg-gradient-to-r from-blue-500 to-cyan-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {renderTimeline()}
            </div>

            {/* Calculator - takes 2 columns (Desktop only) */}
            <div className="hidden md:block md:col-span-2 glass-card p-6 border border-zinc-850 space-y-6 sticky top-6">
              {renderCalculatorForm()}
            </div>
          </div>

          {/* MOBILE ONLY Floating Button for Calculator */}
          {segmentDelay >= 60 && (
            <div className="fixed inset-x-3 bottom-4 z-20 md:hidden">
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-400 to-cyan-400 px-4 py-3.5 text-sm font-bold text-zinc-950 shadow-2xl shadow-cyan-500/20 transition-all active:scale-[0.98]"
              >
                <svg className="w-4 h-4 text-zinc-955" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Calculează compensația
              </button>
            </div>
          )}

          {/* MOBILE ONLY Bottom Drawer for Calculator */}
          {isDrawerOpen && (
            <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/70 backdrop-blur-sm md:hidden">
              <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl border-t border-zinc-800 bg-zinc-900 p-4 pb-14 shadow-2xl animate-slide-up sm:p-6">
                {renderCalculatorForm()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL OVERLAY - Centered Form for Claim Details */}
      {isFormVisible && train && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsFormVisible(false); }}
        >
          <div
            className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-y-auto animate-fade-in"
            style={{ maxHeight: 'calc(100vh - 2rem)' }}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex justify-between items-center z-10">
              <div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                  Cerere de Despăgubire
                </h2>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  Tren {train.trainType} {train.trainNumber} / {train.date}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormVisible(false)}
                className="text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer p-1 rounded-lg hover:bg-zinc-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Summary Badge */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-850 flex justify-between items-center">
                <div>
                  <div className="text-[9px] text-zinc-555 uppercase tracking-wider">Compensație estimată</div>
                  <div className="text-xl font-bold text-cyan-400">{refundAmount ? refundAmount.toFixed(2) : '0.00'} RON <span className="text-xs font-normal text-zinc-500">({refundPercentage}%)</span></div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] text-zinc-555 uppercase tracking-wider">Întârziere</div>
                  <div className="text-sm font-bold text-red-400">{getSelectedSegmentDelay()} min</div>
                </div>
              </div>

              {/* Personal Data */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Date Personale</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="modal-name" className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Nume Complet</label>
                    <input id="modal-name" type="text" placeholder="Ex: Popescu Ion" value={passengerName} onChange={(e) => setPassengerName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="modal-email" className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">E-mail</label>
                    <input id="modal-email" type="email" placeholder="Ex: ion.popescu@gmail.com" value={passengerEmail} onChange={(e) => setPassengerEmail(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="modal-phone" className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Telefon</label>
                    <input id="modal-phone" type="text" placeholder="Ex: 0722123456" value={passengerPhone} onChange={(e) => setPassengerPhone(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="modal-cnp" className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">CNP</label>
                    <input id="modal-cnp" type="text" maxLength={13} placeholder="Ex: 1900101234567" value={passengerCNP} onChange={(e) => setPassengerCNP(e.target.value.replace(/\D/g, ''))} />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Adresă</h3>
                
                <div className="space-y-1">
                  <label htmlFor="modal-street" className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Strada și Numărul</label>
                  <input id="modal-street" type="text" placeholder="Ex: Str. Florilor nr. 5, Bl. A, Ap. 12" value={passengerStreet} onChange={(e) => setPassengerStreet(e.target.value)} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="modal-city" className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Oraș</label>
                    <input id="modal-city" type="text" placeholder="Ex: Cluj-Napoca" value={passengerCity} onChange={(e) => setPassengerCity(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="modal-zip" className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Cod Poștal</label>
                    <input id="modal-zip" type="text" placeholder="Ex: 400110" value={passengerZip} onChange={(e) => setPassengerZip(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="modal-country" className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Țară</label>
                    <input id="modal-country" type="text" placeholder="România" value={passengerCountry} onChange={(e) => setPassengerCountry(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Date Bancare (pentru restituire)</h3>
                
                <div className="space-y-1">
                  <label htmlFor="modal-iban" className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Cont IBAN</label>
                  <input id="modal-iban" type="text" placeholder="Ex: RO49AAAA1B31007593840000" value={passengerIBAN} onChange={(e) => setPassengerIBAN(e.target.value.toUpperCase())} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="modal-bank" className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Banca</label>
                    <input id="modal-bank" type="text" placeholder="Ex: BT, BCR, ING" value={passengerBank} onChange={(e) => handleBankChange(e.target.value)} />
                    <p className="text-[9px] text-zinc-600">Codul SWIFT se completează automat</p>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="modal-swift" className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Cod SWIFT / BIC</label>
                    <input id="modal-swift" type="text" placeholder="Se completează automat" value={passengerSWIFT} onChange={(e) => setPassengerSWIFT(e.target.value.toUpperCase())} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="modal-ticket" className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Nr. Bilet / Legitimatie</label>
                  <input id="modal-ticket" type="text" placeholder="Ex: CFR-92" value={ticketNumber} onChange={(e) => setTicketNumber(e.target.value)} />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-2">
                <a
                  href={getMailtoLink()}
                  onClick={() => { setIsFormVisible(false); setIsDrawerOpen(false); }}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-zinc-950 bg-gradient-to-r from-blue-400 to-cyan-400 hover:from-blue-300 hover:to-cyan-300 transition-all shadow-lg hover:shadow-cyan-500/10 cursor-pointer text-center text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Trimite E-mail Reclamație
                </a>

                <button
                  type="button"
                  onClick={() => { generateOfficialPDF(); setIsFormVisible(false); }}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-zinc-200 bg-zinc-800 border border-zinc-700 hover:bg-zinc-750 transition-all cursor-pointer text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Generează Cererea Oficială (PDF)
                </button>
              </div>

              {/* Instructions Note */}
              <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-900/35 text-[10px] text-zinc-400 leading-normal space-y-2">
                <p>
                  <strong>Către:</strong> <strong className="text-zinc-200">{getOperatorInfo(train.trainNumber).name}</strong> &mdash; <strong className="text-zinc-300">{getOperatorInfo(train.trainNumber).email}</strong>
                </p>
                <p className="text-zinc-550">
                  Dacă aplicația ta de e-mail nu se deschide automat, generează cererea oficială ca PDF, salveaz-o pe dispozitivul tău, apoi trimite-o manual ca atașament la adresa de mai sus, împreună cu o copie a biletului.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-8 border-t border-zinc-900 py-6 text-center text-xs text-zinc-650">
        <p>&copy; 2026 Tren-Întârziat.ro. Acest proiect este un instrument civic independent și nu este afiliat cu CFR Călători, InfoFer sau alți operatori feroviari.</p>
      </footer>
      </div>
    </main>
  );
}
