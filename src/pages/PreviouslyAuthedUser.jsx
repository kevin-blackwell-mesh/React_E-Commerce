import React, { useState } from "react"; // Import useState
import { Footer, Navbar } from "../components";
import { useSelector, useDispatch } from "react-redux";
import { addCart, delCart } from "../redux/action";
import { Link } from "react-router-dom";
import { createLink } from "@meshconnect/web-link-sdk";
import toast from "react-hot-toast";

// const clientId = process.env.REACT_APP_MESHCONNECT_CLIENT_ID;
// const apiSecret = process.env.REACT_APP_MESHCONNECT_API_SECRET;
// const baseUrl = process.env.REACT_APP_MESHCONNECT_URL;
const clientId = process.env.REACT_APP_MESHCONNECT_CLIENT_ID_PROD;
const apiSecret = process.env.REACT_APP_MESHCONNECT_API_SECRET_PROD;
const baseUrl = process.env.REACT_APP_MESHCONNECT_URL_PROD;

const PreviouslyAuthedUser = () => {
  const state = useSelector((state) => state.handleCart);
  const dispatch = useDispatch();

  // State to store portfolio data and connection status
  const [coinbasePortfolio, setCoinbasePortfolio] = useState(null);
  const [coinbaseAccessTokens, setCoinbaseAccessTokens] = useState("");

  const EmptyCart = () => {
    return (
      <div className="container">
        <div className="row">
          <div className="col-md-12 py-5 bg-light text-center">
            <h4 className="p-3 display-5">Your Cart is Empty</h4>
            <Link to="/" className="btn  btn-outline-dark mx-4">
              <i className="fa fa-arrow-left"></i> Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  };

  const addItem = (product) => {
    dispatch(addCart(product));
  };
  const removeItem = (product) => {
    dispatch(delCart(product));
  };

  const handleConnectMesh = async (
    integrationName,
    subtotal,
    shipping,
    networkId
  ) => {
    try {
      // 1. Fetch the Link Token from backend
      const linkToken = await fetchLinkToken(
        integrationName,
        subtotal,
        shipping,
        networkId
      );

      // 2. Create the MeshConnect Link
      const meshLink = await createLink({
        clientId: clientId,
        linkToken: linkToken,
        onIntegrationConnected: async (payload) => {
          console.log("Integration connected:", payload);
          toast.success(`${integrationName} Connected!`);
          var accessToken = [
            {
              "accessToken": payload.accessToken.accountTokens[0].accessToken,
              "brokerType": payload.accessToken.brokerType,
              "accountId": payload.accessToken.accountTokens[0].account.accountId,
              "accountName": payload.accessToken.accountTokens[0].account.accountName,
              "brokerName": payload.accessToken.brokerName
            }
          ]

          setCoinbaseAccessTokens(accessToken)
          console.log(accessToken)


          // Fetch and display portfolio data
          try {
            const portfolio = await fetchPortfolio(
              payload.accessToken.accountTokens[0].accessToken, "coinbase"
              // coinbaseIntegrationId, "coinbase"
            );

            if (integrationName === "Coinbase") {
              setCoinbasePortfolio(portfolio);
            }
          } catch (error) {
            console.error("Error fetching portfolio:", error);
            toast.error(`Error fetching ${integrationName} portfolio`);
          }
        },
        onExit: (error) => {
          // Handle link exit (e.g., display a message to the user)
          if (error) {
            console.error("MeshConnect link exited with error:", error);
            toast.error(`Error connecting to ${integrationName}`);
          } else {
            console.log("MeshConnect link exited.");
            toast.success(`${integrationName} connection closed.`);
          }
        },
      });

      // Open MeshConnect
      meshLink.openLink(linkToken);
    } catch (error) {
      console.error("Error creating MeshConnect link:", error);
      toast.error(`Failed to connect to ${integrationName}`);
      // Handle the error (e.g., display an error message)
    }
  };

  const reconnectMesh = async (
    integrationName,
    subtotal,
    shipping,
    networkId
  ) => {
    try {
      // 1. Fetch the Link Token from backend
      const linkToken = await fetchLinkTokenReconnect(
        integrationName,
        subtotal,
        shipping,
        networkId
      );

      // 2. Create the MeshConnect Link
      const meshLink = await createLink({
        // clientId: clientId,
        linkToken: linkToken,
        accessTokens: coinbaseAccessTokens,
      });

      // Open MeshConnect
      meshLink.openLink(linkToken);
    } catch (error) {
      console.error("Error creating MeshConnect link:", error);
      toast.error(`Failed to connect to ${integrationName}`);
      // Handle the error (e.g., display an error message)
    }
  };

  const fetchLinkToken = async (
    integrationName,
    subtotal,
    shipping,
    integrationId = "aa883b03-120d-477c-a588-37c2afd3ca71"
  ) => {
    const response = await fetch(baseUrl + "/api/v1/linktoken", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": clientId,
        "X-Client-Secret": apiSecret,
      },
      body: JSON.stringify({
        userId: "Mesh",
        integrationId: integrationId,
        disableApiKeyGeneration: false,
      }),
    });





    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch link token");
    }

    console.log(data.content.linkToken)
    return data.content.linkToken;
  };

  const fetchLinkTokenReconnect = async (
    integrationName,
    subtotal,
    shipping,
  ) => {
    const response = await fetch(baseUrl + "/api/v1/linktoken", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": clientId,
        "X-Client-Secret": apiSecret,
      },
      body: JSON.stringify({
        userId: "Mesh",
        disableApiKeyGeneration: false,
        transferOptions: {
          toAddresses: [
            {
              networkId: "e3c7fdd8-b1fc-4e51-85ae-bb276e075611",
              symbol: "USDC",
              address: "0x0Ff0000f0A0f0000F0F000000000ffFf00f0F0f0",
            }
          ],
          fundingOptions: {
            enabled: true
          },
        }
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch link token");
    }

    console.log(data.content.linkToken)
    return data.content.linkToken;
  };

  const fetchPortfolio = async (accessToken, broker) => {
    const response = await fetch(baseUrl + "/api/v1/holdings/get", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": clientId,
        "X-Client-Secret": apiSecret
      },
      body: JSON.stringify({
        "authToken": accessToken,
        "type": broker,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch portfolio");
    }
    return data;
  };

  const ShowCart = () => {
    let subtotal = 0;
    let shipping = 30.0;
    let totalItems = 0;
    state.map((item) => {
      return (subtotal += item.price * item.qty);
    });

    state.map((item) => {
      return (totalItems += item.qty);
    });
    return (
      <>
        <section className="h-100 gradient-custom">
          <div className="container py-5">
            <div className="row d-flex justify-content-center my-4">
              <div className="col-md-8">
                <div className="card mb-4">
                  <div className="card-header py-3">
                    <h5 className="mb-0">Item List</h5>
                  </div>
                  <div className="card-body">
                    {state.map((item) => {
                      return (
                        <div key={item.id}>
                          <div className="row d-flex align-items-center">
                            <div className="col-lg-3 col-md-12">
                              <div
                                className="bg-image rounded"
                                data-mdb-ripple-color="light"
                              >
                                <img
                                  src={item.image}
                                  // className="w-100"
                                  alt={item.title}
                                  width={100}
                                  height={75}
                                />
                              </div>
                            </div>

                            <div className="col-lg-5 col-md-6">
                              <p>
                                <strong>{item.title}</strong>
                              </p>
                              {/* <p>Color: blue</p>
                              <p>Size: M</p> */}
                            </div>

                            <div className="col-lg-4 col-md-6">
                              <div
                                className="d-flex mb-4"
                                style={{ maxWidth: "300px" }}
                              >
                                <button
                                  className="btn px-3"
                                  onClick={() => {
                                    removeItem(item);
                                  }}
                                >
                                  <i className="fas fa-minus"></i>
                                </button>

                                <p className="mx-5">{item.qty}</p>

                                <button
                                  className="btn px-3"
                                  onClick={() => {
                                    addItem(item);
                                  }}
                                >
                                  <i className="fas fa-plus"></i>
                                </button>
                              </div>

                              <p className="text-start text-md-center">
                                <strong>
                                  <span className="text-muted">{item.qty}</span>{" "}
                                  x ${item.price}
                                </strong>
                              </p>
                            </div>
                          </div>

                          <hr className="my-4" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card mb-4">
                  <div className="card-header py-3 bg-light">
                    <h5 className="mb-0">Order Summary</h5>
                  </div>
                  <div className="card-body">
                    <ul className="list-group list-group-flush">
                      <li className="list-group-item d-flex justify-content-between align-items-center border-0 px-0 pb-0">
                        Products ({totalItems})
                        <span>${Math.round(subtotal)}</span>
                      </li>
                      <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                        Shipping
                        <span>${shipping}</span>
                      </li>
                      <li className="list-group-item d-flex justify-content-between align-items-center border-0 px-0 mb-3">
                        <div>
                          <strong>Total amount</strong>
                        </div>
                        <span>
                          <strong>${Math.round(subtotal + shipping)}</strong>
                        </span>
                      </li>
                    </ul>

                    <Link
                      to="/checkout"
                      className="btn btn-dark btn-lg btn-block"
                    >
                      Go to checkout
                    </Link>
                    <hr />

                    {/* Coinbase Connect and Transfer */}
                    <button
                      onClick={() =>
                        handleConnectMesh(
                          "Coinbase",
                          subtotal,
                          shipping,
                          "e3c7fdd8-b1fc-4e51-85ae-bb276e075611"
                        )
                      }
                      className="btn btn-lg btn-primary m-2"
                    >
                      Connect Coinbase
                    </button>
                    <button
                      onClick={() =>
                        reconnectMesh(
                          "Coinbase",
                          subtotal,
                          shipping,
                          "e3c7fdd8-b1fc-4e51-85ae-bb276e075611"
                        )
                      }
                      className="btn btn-lg btn-primary m-2"
                    >
                      Reconnect Coinbase
                    </button>
                    {coinbasePortfolio && (<h6>Coinbase Portfolio</h6>)}
                    {coinbasePortfolio?.content.cryptocurrencyPositions.map((balance) => (
                      <div key={balance.name}>
                        {balance.symbol}: {balance.amount}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  };

  return (
    <>
      <Navbar />
      <div className="container my-3 py-3">
        <h1 className="text-center">Cart</h1>
        <hr />
        {state.length > 0 ? <ShowCart /> : <EmptyCart />}
      </div>
      <Footer />
    </>
  );
};

export default PreviouslyAuthedUser;