---
title: The Comparative Study on the Effect of Selection of Key Partner Countries of
  ODA and FDI in KOREA
author: "Jeeyoung KIM, Jeongsuk Moon, and Kiyoung Moon"
date: '2021 4 26 '
output:
  pdf_document: default
  html_document: default
---

```{r setup, include=FALSE}
knitr::opts_chunk$set(echo = TRUE)
```

## R Markdown

This is an R Markdown document. Markdown is a simple formatting syntax for authoring HTML, PDF, and MS Word documents. For more details on using R Markdown see <http://rmarkdown.rstudio.com>.

When you click the **Knit** button a document will be generated that includes both content as well as the output of any embedded R code chunks within the document. You can embed an R code chunk like this:

```{r cars}
library(tidyverse)
library(countrycode)
library(readxl)
library(ggplot2)
```

## I. Abstract
Isolated Team examines 1) the effects of the selection of key partner countries of Official Development Assistance (ODA) on Foreign Direct Investment (FDI) comparing between key partner countries and general partner countries of ODA, 2) the relationship between ODA and the types of FDI.


## II. Data
gODA data : from OECD (https://data.oecd.org/oda/net-oda.htm)
FDI data : from The Export-Import Bank of Korea (https://stats.koreaexim.go.kr/sub/countryStatistics.do)


## III. Relevant Regulations (Republic of Korea)
1) Economic Development Cooperation Fund Act (enacted in 1987) regulates the establishment, operation and management of the Economic Development Cooperation Fund as concessional loan
2)	Act on the Measures for the Admission to International Financial Institutions (enacted in 1963) regulates the membership with the international financial institutions and measures to discharge the responsibilities as a member prescribed in the agreements governing the respective international financial institutions
3) Korea International Cooperation Agency Act (enacted in 1991) sets out the foundation of Korea International Cooperation Agency (KOICA) and its mandates to carry out grant aid projects and technical cooperation
4)	Overseas Emergency Relief Act (enacted in 2007) prescribes the matters necessary for overseas emergency relief, such as dispatch of emergency relief teams, provision of emergency relief supplies, support for interim recovery from disasters, etc.


## IV. The overview of Korea ODA
<Background>
1)	2010: Korea joined the Organization for Economic Cooperation and Development (OECD) Development Assistance Committee (DAC), which is a group of donor countries
2)	2010~present : Korea has made various efforts to contribute to the international community through ODA
The size or scale of Korea¡¯s ODA has been more than doubled in ten years, while many advanced donors have reduced or have not increased that of their ODA due to difficult economic conditions. For example, the size of Korea¡¯s ODA was about 1.2 billion dollars in 2010, when Korea joined DAC, but it has reached 2.5 billion dollars in 2019, while twelve donor countries including Spain, Greece, and Portugal among 29 members of OECD DAC have decreased their support of ODA during the same period (OECD DAC, 2020). Also, the Korean government has been working to drive a systematic and predictable ODA
3)	January, 2021 : Korean government newly selected 27 key ODA partners to be applied by 2025
The number of key partners has increased slightly from 26 countries in 2010, 24 partners in 2015, to 27 partners this time

<ODA Programming Process>
The entire process of ODA programming consists of planning, delivering, monitoring & evaluating, and feedback process in general.
```{r cars}
setwd("C:/data/final_project")
oda_fdi_dat <- read.csv("oda_fdi_data.csv")
fdi_dat<-read_excel("FDI_Korea.xlsx")
oda_fdi_dat %>%
      filter(year == 2019) %>%

      ggplot(oda_fdi_dat) +
      geom_point(aes(x = log(oda_amount), y=log(investment),
                     colour = continent), size=1.5)+
      geom_smooth(aes(x=log(oda_amount), y=log(investment), color=continent), method = "lm", se = F)+
      scale_x_continuous("Log Amount of ODA")+
      scale_y_continuous("Log Amount of FDI")+
      theme_bw()
```

## V. References
You can refer, if you are interested in this area
???	Boone, Peter. (1996). Politics and the effectiveness of foreign aid. European Economic Review 40(2), 289~329.
???	Burnside, Craig, & David Dollar. (2000). Aid, policies, and growth. American Economic Review 90(4), 847~868. 
???	Chung, Taeyoung. (2016). Effectiveness of Korean ODA. International Business Review, 20 (4), 211-229. 
???	Committee for International Development Cooperation. (2020). A Plan of Re-designation of Key Partner Countries. Sejong: Committee for International Development Cooperation.
???	Dalgaard, C., Henrik H., & Finn T. On the empirics of foreign aid and growth. Economic Journal 114, 191~216. 
???	Export-Import Bank of Korea. (2012). Analysis of Effects of Korean ODA to Vietnam's Economic Growth. Seoul, South Korea: Author. 
???	Harms, Philipp and Matthias Lutz, M. (2006). Aid, Governance and Private Foreign Investment: Some Puzzling Findings for the 1990s. The Economic Journal 116(513): 773-790.
???	International Development Cooperation Committee. (2015). Plan of Reselection of the Key Partner Countries on ODA. Sejong, South Korea: Author.
???	International Development Cooperation Committee. (2019). International development cooperation comprehensive implementation plan in 2019. Sejong, South Korea: Author.
???	Isham, J., Daniel, K., & Lant, P. (1995). Governance and returns on investment: Empirical investigation. World Bank Policy Research Working Paper 1550. 
???	Jang, Hyojin, Kim, Woorim, & Kwon, Hyukjoo. (2015). Analysis of development cooperation project evaluation system in terms of development effectiveness: Focused on the comparison of development cooperation projects in Germany, the UK, and Korea. Korea Policy Science Review 24(3). 
???	Jun, Sunghee. (2011). Examining the Determinants on Inflow of FDI in Developing Countries. International Trade Study, 16(4): 63-87.  
???	KDI School of Public Policy and Management. (2020). A Study on the Re-designation of Key Partner Countries. Sejong: KDI School of Public Policy and Management.
???	Kimura, Hidemi and Yasuyuki Todo. (2010). Is Foreign Aid a Vanguard of Foreign Direct Investment? A Gravity-Equation Approach. World Development 38(4): 482???497.
???	Kim, sewon, Kim, jonsub & Lee, youngsub. (2013). A Study on Operating Key Partner Countries in Major Donor Countries. Sejong: KIEP
???	Kim, Sugwoo, and Namgung, Heejin. (2016). The Political Economy on Selecting Korea¡¯s Key Partners. Policy Information Study. 19(1): 135-158.
???	Kim, Youngwan. (2017). Analysis of the First South Korean Focus Countries of Official Development Assistance : Focusing on Foreign Direct Investment. Korea Policy, 51(1), 287-386. 
???	Kosack, Stephen and Jennifer Tobin. (2006). Funding Self-Sustaining Development: The Role of Aid, FDI and Government in Economic Success. International Organization. 60(1): 205-243.
???	Lee, Kyewoo, & Park, Gihoon. (2007). Evaluation of Korea's 20-year ODA. KDI Journal of Economic Policy, 29(2), 41-74. 
???	Lee, Kyungah, & Hong, giseok. (2012). Official development assistance in recipient countries exports and the economy to grow on impact. Economic Studies, 33(2), 43-72.
???	Lechner, Michael. (2011). The Estimation of Causal Effects by Difference-in-difference Methods.
???	McKinlay, Robert, and Richard Little. (1977). A Foreign Policy Model of US Bilateral Aid Allocation. World Politics 30(1): 58-86.
???	National Law Information Center. (2020). FRAMEWORK ACT ON INTERNATIONAL DEVELOPMENT COOPERATION. Retrieved from http://www.law.go.kr/LSW/eng/engLsSc.do?menuId=2&section=lawNm&query=international+cooperation&x=0&y=0#liBgcolor1
???	Nunnenkamp, P., Thiele, R., & Wilfer, T. (2005). Grants versus loans: Much ado about (almost) nothing. Kiel Economic Policy Papers 4. Retrieved from https://ideas.repec.org/p/zbw/ifwkep/4.html
???	Odedokun, M. (2003). Economics and politics of official loans versus grants: Panoramic issues and empirical evidence. United Nations University. World Institute for Development Economics Research (WIDER). Discussion paper.
???	Odedokun, M. (2004). Multilateral and bilateral loans versus grants: Issues and evidence. World Economy, 27, 239-263.
???	Organization for Economic Cooperation and Development. (2016). Official development assistance ??? definition and coverage. Retrieved from http://www.oecd.org/dac/stats 
???	Organization for Economic Cooperation and Development. (2008). Is it ODA? Retrieved from http://www.oecd.org/dac/stats 
???	Organization for Economic Cooperation and Development Development Assistance Committee. (2019). Aid by DAC members increases in 2019 with more aid to the poorest countries. Retrieved from http://www.oecd.org/newsroom/oecd-and-donor-countries-working-to-focus-development-efforts-on-covid-19-crisis-building-on-a-rise-in-official-aid-in-2019.htm.   
???	Ovaska, T. (2003). Failure of development aid. Cato Journal 23(2), 175~188.
???	Park, Bokyoung, Lee, Hongsik, & Goo, Jungwoo. (2013). A Study on Selecting Factor and Method of Key Partner Countries. Sejong: KIEP.
???	Park, Kyoungdon. (2017). Effects of ODA on economic growth and welfare improvement in developing countries. The Korean Journal of Local Government Studies, 20(4), 141-165. 
???	Rajan, R., & Arvind, S. Aid and growth: What does the cross-country evidence show. IMF Working Paper 5(127).
???	Roodman, David. 2007. "The Anarchy of Numbers: Aid, Development, and Cross-Country Empirics." The World Bank Economic Review, 21(2), 255-277.
???	World Bank. (1998). Assessing Aid. Washington, D.C., USA: Author. 


Note that the `echo = FALSE` parameter was added to the code chunk to prevent printing of the R code that generated the plot.
