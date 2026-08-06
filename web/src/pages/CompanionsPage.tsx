import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Heart, Plus, Sparkles } from "lucide-react";
import { H2 } from "@nous-research/ui/ui/components/typography/h2";
import { Badge } from "@nous-research/ui/ui/components/badge";
import { Button } from "@nous-research/ui/ui/components/button";
import { Card, CardContent } from "@nous-research/ui/ui/components/card";
import { Spinner } from "@nous-research/ui/ui/components/spinner";
import { api, type Companion } from "@/lib/api";

const statusLabel: Record<Companion["setup_status"], string> = {
  provisioning: "创建中",
  needs_channel: "等待连接微信",
  ready: "在线",
  error: "需要处理",
};

export default function CompanionsPage() {
  const navigate = useNavigate();
  const [companions, setCompanions] = useState<Companion[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getCompanions()
      .then(result => setCompanions(result.companions))
      .catch(reason => {
        setError(reason instanceof Error ? reason.message : "读取失败");
        setCompanions([]);
      });
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-rose-400">
            <Heart className="h-4 w-4 fill-current" />
            <span className="text-xs uppercase tracking-[0.2em]">H2OS</span>
          </div>
          <H2>我的伴侣</H2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            人格、记忆、聊天历史和能力都属于这个具体的人。以后更换模型，也不会创建一个新的伴侣。
          </p>
        </div>
        <Button onClick={() => navigate("/companions/new")}>
          <Plus className="mr-2 h-4 w-4" /> 创建伴侣
        </Button>
      </div>

      {companions === null ? (
        <div className="flex min-h-48 items-center justify-center">
          <Spinner />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : companions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 rounded-full bg-rose-500/10 p-4 text-rose-400">
              <Sparkles className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-medium">从一个具体的人开始</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              选择大脑，写下名字和相处方式。H2OS 会为它创建独立空间。
            </p>
            <Button
              className="mt-6"
              onClick={() => navigate("/companions/new")}
            >
              创建第一个伴侣
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {companions.map(companion => (
            <Link
              key={companion.companion_id}
              to={`/companions/${companion.companion_id}`}
            >
              <Card className="h-full transition-colors hover:border-rose-400/50">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400/25 to-violet-500/20 text-xl text-rose-300">
                      {companion.display_name.slice(0, 1).toUpperCase()}
                    </div>
                    <Badge tone="outline">
                      {statusLabel[companion.setup_status]}
                    </Badge>
                  </div>
                  <h3 className="mt-5 text-xl font-medium">
                    {companion.display_name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {companion.relationship_type}
                  </p>
                  <div className="mt-5 border-t border-border/60 pt-4 text-xs text-muted-foreground">
                    <div className="truncate">{companion.model}</div>
                    <div className="mt-1">
                      独立 Profile · {companion.profile_name}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
