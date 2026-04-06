import { Button, Card, CardBody, CardHeader } from "@heroui/react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Sparkles, Image as ImageIcon, Zap } from "lucide-react";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-50 p-6">
      <div className="max-w-2xl w-full text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Sparkles className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Image2Prompt</h1>
        </div>

        <p className="text-lg text-gray-600 mb-10">
          分析任意图片的风格，结合你的文字内容，一键生成新图片
        </p>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <ImageIcon className="w-6 h-6 text-blue-600 mb-2" />
              <h3 className="text-base font-semibold text-gray-900">图片分析</h3>
            </CardHeader>
            <CardBody className="pt-0">
              <p className="text-sm text-gray-600">
                自动识别图片风格、构图、色调、光影
              </p>
            </CardBody>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <Zap className="w-6 h-6 text-emerald-500 mb-2" />
              <h3 className="text-base font-semibold text-gray-900">智能融合</h3>
            </CardHeader>
            <CardBody className="pt-0">
              <p className="text-sm text-gray-600">
                风格模板 + 文字内容 = 完美生成
              </p>
            </CardBody>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <Sparkles className="w-6 h-6 text-amber-500 mb-2" />
              <h3 className="text-base font-semibold text-gray-900">浏览器插件</h3>
            </CardHeader>
            <CardBody className="pt-0">
              <p className="text-sm text-gray-600">
                在任意网页直接使用，无需切换
              </p>
            </CardBody>
          </Card>
        </div>

        <Button
          size="lg"
          color="primary"
          radius="lg"
          className="h-12 px-8 text-base font-medium shadow-md hover:shadow-lg"
          as="a"
          href="/sign-in"
        >
          立即开始
        </Button>
      </div>
    </div>
  );
}
