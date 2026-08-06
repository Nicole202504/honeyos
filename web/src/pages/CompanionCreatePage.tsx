import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Heart,
  Shield,
  Sparkles,
} from "lucide-react";
import { H2 } from "@nous-research/ui/ui/components/typography/h2";
import { Button } from "@nous-research/ui/ui/components/button";
import { Card, CardContent } from "@nous-research/ui/ui/components/card";
import { Input } from "@nous-research/ui/ui/components/input";
import { Label } from "@nous-research/ui/ui/components/label";
import { Spinner } from "@nous-research/ui/ui/components/spinner";
import { api } from "@/lib/api";

interface ModelChoice {
  provider: string;
  model: string;
  label: string;
}

export default function CompanionCreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [choices, setChoices] = useState<ModelChoice[]>([]);
  const [modelChoice, setModelChoice] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [relationship, setRelationship] = useState("伴侣");
  const [personality, setPersonality] = useState("");
  const [communication, setCommunication] =
    useState("像日常联系人一样自然、简洁地回复");
  const [boundaries, setBoundaries] = useState("");
  const [advancedPrompt, setAdvancedPrompt] = useState("");
  const [userName, setUserName] = useState("");
  const [preference, setPreference] = useState("");
  const [commitment, setCommitment] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getModelOptions()
      .then(result => {
        const next: ModelChoice[] = [];
        for (const provider of result.providers ?? []) {
          for (const model of provider.models ?? []) {
            next.push({
              provider: provider.slug,
              model,
              label: `${provider.name} · ${model}`,
            });
          }
        }
        setChoices(next);
      })
      .catch(() => setChoices([]));
  }, []);

  const selected = useMemo(
    () =>
      choices.find(item => `${item.provider}\0${item.model}` === modelChoice),
    [choices, modelChoice],
  );
  const canContinue =
    step === 0
      ? Boolean(selected)
      : Boolean(displayName.trim() && relationship.trim());

  const create = async () => {
    if (!selected) return;
    setCreating(true);
    setError("");
    try {
      const result = await api.createCompanion({
        display_name: displayName.trim(),
        relationship_type: relationship.trim(),
        personality,
        communication_style: communication,
        boundaries,
        advanced_system_prompt: advancedPrompt,
        provider: selected.provider,
        model: selected.model,
        api_key: apiKey || undefined,
        avatar_data_url: avatarDataUrl,
        user_name: userName,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        user_preferences: preference.trim() ? [preference.trim()] : [],
        initial_commitments: commitment.trim() ? [commitment.trim()] : [],
      });
      navigate(`/companions/${result.companion_id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "创建失败");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Button
        ghost
        size="sm"
        onClick={() => (step ? setStep(step - 1) : navigate("/companions"))}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回
      </Button>
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
          <Heart className="h-6 w-6 fill-current" />
        </div>
        <H2>创建一个属于你的伴侣</H2>
        <p className="mt-2 text-sm text-muted-foreground">
          模型是大脑；人格、记忆和你们的关系会留在同一个 Companion Profile。
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        {["选择大脑", "定义伴侣", "建立起点"].map((label, index) => (
          <div
            key={label}
            className={
              index <= step ? "text-rose-400" : "text-muted-foreground"
            }
          >
            <div
              className={`mb-2 h-1 rounded ${index <= step ? "bg-rose-400" : "bg-border"}`}
            />
            {label}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-5 p-6 sm:p-8">
          {step === 0 && (
            <>
              <div className="flex items-center gap-3">
                <Brain className="h-5 w-5 text-violet-400" />
                <div>
                  <h3 className="font-medium">选择模型</h3>
                  <p className="text-xs text-muted-foreground">
                    以后可以更换，不会失去伴侣身份和记忆。
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="companion-model">Provider 与模型</Label>
                <select
                  id="companion-model"
                  value={modelChoice}
                  onChange={event => setModelChoice(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">请选择…</option>
                  {choices.map(choice => (
                    <option
                      key={`${choice.provider}\0${choice.model}`}
                      value={`${choice.provider}\0${choice.model}`}
                    >
                      {choice.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="companion-key">
                  API Key（OAuth / 本地模型可留空）
                </Label>
                <Input
                  id="companion-key"
                  type="password"
                  autoComplete="off"
                  value={apiKey}
                  onChange={event => setApiKey(event.target.value)}
                  placeholder="只保存在这个伴侣的独立密钥文件中"
                />
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-rose-400" />
                <div>
                  <h3 className="font-medium">定义这个人是谁</h3>
                  <p className="text-xs text-muted-foreground">
                    这些内容会生成稳定的 SOUL，人格修改在下一段新对话生效。
                  </p>
                </div>
              </div>
          <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="display-name">名字</Label>
                  <Input
                    id="display-name"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Luna"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="relationship">你们的关系</Label>
                  <Input
                    id="relationship"
                    value={relationship}
                    onChange={e => setRelationship(e.target.value)}
                  />
                </div>
              </div>
              <Field
                label="性格与表达"
                value={personality}
                onChange={setPersonality}
                placeholder="温柔、独立、有自己的判断"
              />
              <Field
                label="沟通方式"
                value={communication}
                onChange={setCommunication}
              />
              <Field
                label="相处边界"
                value={boundaries}
                onChange={setBoundaries}
                placeholder="不替我做医疗和金融决策"
              />
              <Field
                label="高级 System Notes（可选）"
                value={advancedPrompt}
                onChange={setAdvancedPrompt}
                rows={4}
              />
            </>
          )}
          {step === 2 && (
            <>
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-emerald-400" />
                <div>
                  <h3 className="font-medium">写入第一批确定记忆</h3>
                  <p className="text-xs text-muted-foreground">
                    只写已经确认的偏好与约定，不让模型猜测。
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-name">希望它怎么称呼你</Label>
                <Input
                  id="user-name"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder="小林"
                />
              </div>
              <Field
                label="一个明确偏好（可选）"
                value={preference}
                onChange={setPreference}
                placeholder="我不喜欢长篇回复"
              />
              <Field
                label="第一条共同约定（可选）"
                value={commitment}
                onChange={setCommitment}
                placeholder="周五一起看电影"
              />
              <div className="rounded-lg border border-border/60 bg-muted/25 p-4 text-sm">
                <div className="font-medium">将创建</div>
                <div className="mt-2 text-muted-foreground">
                  {displayName || "未命名"} · {relationship} · {selected?.label}
                </div>
              </div>
            </>
          )}
          {error && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex justify-end pt-2">
            {step < 2 ? (
              <Button disabled={!canContinue} onClick={() => setStep(step + 1)}>
                继续 <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                disabled={creating || !canContinue}
                onClick={() => void create()}
              >
                {creating && <Spinner className="mr-2" />}创建伴侣
              </Button>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="companion-avatar">头像（可选）</Label>
            <div className="flex items-center gap-3">
              {avatarDataUrl && (
                <img
                  src={avatarDataUrl}
                  alt="头像预览"
                  className="h-12 w-12 rounded-2xl object-cover"
                />
              )}
              <Input
                id="companion-avatar"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) {
                    setError("头像不能超过 5 MB");
                    event.target.value = "";
                    return;
                  }
                  setError("");
                  const reader = new FileReader();
                  reader.onload = () => setAvatarDataUrl(String(reader.result));
                  reader.readAsDataURL(file);
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">PNG、JPEG、WebP 或 GIF，最大 5 MB。</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <textarea
        rows={rows}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}
