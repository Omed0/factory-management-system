import { Metadata } from 'next';

import { Overview } from './components/overview';
import { RecentSales } from './components/recent-sales';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { changeDateToString, seperateDates } from '@/lib/utils';
import {
  getCustomersWhoDidntGiveLoanActions, getDashboardInfoActions,
  getDashboardInfoChartActions
} from '@/actions/information';
import Cards from './components/cards';
import CalenderRangMultiSide from '@/components/calender-rang-multi-side';
import NotificationCard from './components/notification-card';
import { BellDot, BellRing } from 'lucide-react';


export const metadata: Metadata = {
  title: 'داشبۆرد',
};

type Props = {
  searchParams: {
    date: string
  }
};

export const dynamic = 'force-dynamic'

export default async function DashboardPage({ searchParams }: Props) {
  const dates = changeDateToString(seperateDates(searchParams.date))

  const informations = await getDashboardInfoActions(searchParams.date ? dates : undefined)
  const chartInfo = await getDashboardInfoChartActions()
  const notificationLoan = await getCustomersWhoDidntGiveLoanActions()

  const isFail = !informations.data || !chartInfo.data || !notificationLoan.data

  if (isFail) {
    return <div className="w-full h-full flex items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-2">
        <h1 className="text-lg font-medium">{informations.message || chartInfo.message}</h1>
      </div>
    </div>
  }

  const { latestSales, totalSalesCount, ...rest } = informations.data
  const hasNotification = notificationLoan.data.oneMonthAgoCustomers.length > 0 || notificationLoan.data.twoMonthsAgoCustomers.length > 0

  return (
    <section className="p-3">
      <div className="hidden flex-col md:flex">
        <div className="flex-1 pt-4">
          <Tabs defaultValue="overview" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className='space-x-2'>
                  <CalenderRangMultiSide
                    btnClassName='h-9'
                    noDefault isShowResetButton />
                </div>
              </div>
              <TabsList>
                <TabsTrigger value="notifications" className='relative'>
                  {hasNotification && (<span className='absolute -top-2 -start-2'>
                    <BellRing className='size-5 fill-current text-red-400' />
                  </span>)}
                  ئاگادارکردنەوە
                </TabsTrigger>
                <TabsTrigger value="overview" >داشبۆرد</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="overview" className="space-y-6">
              {/* cards header */}
              <Cards amounts={{ totalSalesCount, ...rest }} />
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                  <CardHeader>
                    <CardTitle className='ms-auto'>داهاتی مانگانەی ئەم ساڵ</CardTitle>
                  </CardHeader>
                  <CardContent className="ps-2">
                    <Overview data={chartInfo.data} />
                  </CardContent>
                </Card>
                <Card className="col-span-3">
                  <CardHeader className='items-end'>
                    <CardTitle>کۆتا فرۆشراوەکان</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RecentSales data={{ latestSales }} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent dir='rtl' value="notifications" className="space-y-4 container mx-auto p-4">
              <h1 className="text-2xl font-bold mb-5">ئاگادارکردنەوەکان</h1>
              <section className="w-full flex">
                <div className='space-y-3 w-[70%]'>
                  <h2>ئەوانەی مانگێکە قەرزارن</h2>
                  <div className='grid gap-4 grid-cols-2 overflow-scroll'>
                    {notificationLoan.data.oneMonthAgoCustomers.map((sale) => (
                      <NotificationCard key={sale.id} sale={sale} />
                    ))}
                  </div>
                </div>
                <div className='space-y-3 w-[30%] border-s ps-3'>
                  <h2>ئەوانەی لە دوومانگ زیاترە قەرزارن</h2>
                  <div className='grid gap-4 grid-cols-1 overflow-scroll'>
                    {notificationLoan.data.twoMonthsAgoCustomers.map((sale) => (
                      <NotificationCard key={sale.id} sale={sale} />
                    ))}
                  </div>
                </div>
              </section>
            </TabsContent>
          </Tabs>
          <div>

          </div>
        </div>
      </div>
    </section>
  );
}
