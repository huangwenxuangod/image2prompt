import { Button, Card, CardBody, CardHeader, Tabs, Tab } from "@heroui/react";
import { UserButton, auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Image as ImageIcon, History, Palette, LogOut } from "lucide-react";

export default async function Dashboard() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900">Image2Prompt</h1>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <Tabs
          color="primary"
          radius="lg"
          classNames={{
            tabList: "bg-gray-100 p-1",
            tab: "data-[selected=true]:bg-white data-[selected=true]:shadow-sm",
          }}
        >
          <Tab
            key="generate"
            title={
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                生成图片
              </div>
            }
          >
            <Card className="border border-gray-200 shadow-sm mt-4">
              <CardHeader className="pb-3">
                <h2 className="text-lg font-semibold text-gray-900">快速生成</h2>
              </CardHeader>
              <CardBody className="pt-0">
                <p className="text-sm text-gray-600">
                  在浏览器插件中使用更方便！安装插件后，在任意网页划词即可生成。
                </p>
              </CardBody>
            </Card>
          </Tab>

          <Tab
            key="history"
            title={
              <div className="flex items-center gap-2">
                <History className="w-4 h-4" />
                历史记录
              </div>
            }
          >
            <Card className="border border-gray-200 shadow-sm mt-4">
              <CardHeader className="pb-3">
                <h2 className="text-lg font-semibold text-gray-900">生成历史</h2>
              </CardHeader>
              <CardBody className="pt-0">
                <p className="text-sm text-gray-600">暂无生成历史</p>
              </CardBody>
            </Card>
          </Tab>

          <Tab
            key="templates"
            title={
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                风格模板
              </div>
            }
          >
            <Card className="border border-gray-200 shadow-sm mt-4">
              <CardHeader className="pb-3">
                <h2 className="text-lg font-semibold text-gray-900">我的风格模板</h2>
              </CardHeader>
              <CardBody className="pt-0">
                <p className="text-sm text-gray-600">暂无风格模板</p>
              </CardBody>
            </Card>
          </Tab>
        </Tabs>
      </main>
    </div>
  );
}
