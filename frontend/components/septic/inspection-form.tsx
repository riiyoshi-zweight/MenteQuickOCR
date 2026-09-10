"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Check } from "lucide-react"
import type { Customer } from "@/lib/septic/customers"

type CheckItemStatus = {
  value: "ok" | "ng" | null
  reason: string
}

const checkItems = [
  "スカム・汚泥量",
  "モーター・ブロワー",
  "ばっき状況",
  "臭気",
  "水の使用量",
  "消毒状況",
  "放流状況",
  "返送水",
  "手動逆流",
  "消毒薬品補充",
  "外観異常",
]

const cleaningOptions = ["年", "別", "汚", "清"]

type Props = {
  customer: Customer
  onBack: () => void
  onSubmit: () => void
}

export function InspectionForm({ customer, onBack, onSubmit }: Props) {
  const [step, setStep] = useState<"checklist" | "numbers" | "complete">("checklist")
  const [checkStatuses, setCheckStatuses] = useState<Record<string, CheckItemStatus>>(
    Object.fromEntries(checkItems.map((item) => [item, { value: null, reason: "" }]))
  )
  const [numericValues, setNumericValues] = useState({
    waterTemp: "",
    transparency: "",
    residualChlorine: "",
    sv: "",
    gr: "",
    ph: "",
    dissolvedOxygen: "",
  })
  const [cleaning, setCleaning] = useState<string[]>([])

  const handleCheckChange = (item: string, value: "ok" | "ng") => {
    setCheckStatuses((prev) => ({
      ...prev,
      [item]: { ...prev[item], value, reason: value === "ok" ? "" : prev[item].reason },
    }))
  }

  const handleReasonChange = (item: string, reason: string) => {
    setCheckStatuses((prev) => ({
      ...prev,
      [item]: { ...prev[item], reason },
    }))
  }

  const handleNumericChange = (field: string, value: string) => {
    setNumericValues((prev) => ({ ...prev, [field]: value }))
  }

  const handleCleaningToggle = (option: string) => {
    setCleaning((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    )
  }

  const handleSubmit = () => {
    setStep("complete")
  }

  const handleComplete = () => {
    onSubmit()
  }

  if (step === "complete") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
        <div className="w-20 h-20 bg-[#e8f6ff] rounded-full flex items-center justify-center">
          <Check className="w-10 h-10 text-[#38b6ff]" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">点検完了</h2>
        <p className="text-muted-foreground">{customer.name} の点検が完了しました</p>
        <Button
          onClick={handleComplete}
          size="lg"
          className="bg-[#38b6ff] hover:bg-[#2aa3ed] text-white"
        >
          一覧に戻る
        </Button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-4 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">{customer.name}</h1>
          <p className="text-sm text-muted-foreground">{customer.address}</p>
        </div>
        <div className="ml-auto text-sm text-muted-foreground">
          {step === "checklist" ? "1/2 チェックリスト" : "2/2 数値入力"}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {step === "checklist" && (
          <Card>
            <CardHeader>
              <CardTitle>チェックリスト</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {checkItems.map((item) => (
                <div key={item} className="border-b border-border pb-4 last:border-0">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">{item}</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={checkStatuses[item].value === "ok" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleCheckChange(item, "ok")}
                        className={checkStatuses[item].value === "ok" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                      >
                        ○
                      </Button>
                      <Button
                        type="button"
                        variant={checkStatuses[item].value === "ng" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleCheckChange(item, "ng")}
                        className={checkStatuses[item].value === "ng" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                  {checkStatuses[item].value === "ng" && (
                    <Textarea
                      placeholder="理由を入力してください"
                      value={checkStatuses[item].reason}
                      onChange={(e) => handleReasonChange(item, e.target.value)}
                      className="mt-2"
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {step === "numbers" && (
          <Card>
            <CardHeader>
              <CardTitle>数値入力</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="waterTemp">水温</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="waterTemp"
                      type="number"
                      value={numericValues.waterTemp}
                      onChange={(e) => handleNumericChange("waterTemp", e.target.value)}
                    />
                    <span className="text-muted-foreground">℃</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transparency">透視度</Label>
                  <Input
                    id="transparency"
                    type="number"
                    value={numericValues.transparency}
                    onChange={(e) => handleNumericChange("transparency", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="residualChlorine">残留塩素</Label>
                  <Input
                    id="residualChlorine"
                    type="number"
                    step="0.1"
                    value={numericValues.residualChlorine}
                    onChange={(e) => handleNumericChange("residualChlorine", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sv">SV</Label>
                  <Input
                    id="sv"
                    type="number"
                    value={numericValues.sv}
                    onChange={(e) => handleNumericChange("sv", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gr">GR</Label>
                  <Input
                    id="gr"
                    type="number"
                    value={numericValues.gr}
                    onChange={(e) => handleNumericChange("gr", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ph">pH</Label>
                  <Input
                    id="ph"
                    type="number"
                    step="0.1"
                    value={numericValues.ph}
                    onChange={(e) => handleNumericChange("ph", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dissolvedOxygen">溶存酸素</Label>
                  <Input
                    id="dissolvedOxygen"
                    type="number"
                    step="0.1"
                    value={numericValues.dissolvedOxygen}
                    onChange={(e) => handleNumericChange("dissolvedOxygen", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>清掃</Label>
                <div className="flex gap-4">
                  {cleaningOptions.map((option) => (
                    <div key={option} className="flex items-center gap-2">
                      <Checkbox
                        id={`cleaning-${option}`}
                        checked={cleaning.includes(option)}
                        onCheckedChange={() => handleCleaningToggle(option)}
                      />
                      <Label htmlFor={`cleaning-${option}`} className="cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="p-4 border-t border-border flex justify-between">
        {step === "checklist" ? (
          <>
            <Button variant="outline" onClick={onBack}>
              キャンセル
            </Button>
            <Button
              onClick={() => setStep("numbers")}
              className="bg-[#38b6ff] hover:bg-[#2aa3ed] text-white"
            >
              次へ
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => setStep("checklist")}>
              戻る
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-[#38b6ff] hover:bg-[#2aa3ed] text-white"
            >
              提出
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
